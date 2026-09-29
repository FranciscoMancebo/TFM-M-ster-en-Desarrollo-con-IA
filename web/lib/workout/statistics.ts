import { latestLiftRecords } from './lifts';
import type {
  CompletedWorkout,
  LiftRecord,
  LiftType,
  TrainingCategory,
} from './types';

export type WeeklyExerciseVolume = {
  exerciseId: string;
  exerciseName: string;
  volumeKg: number;
};

export type WeeklyVolume = {
  weekStart: string;
  totalVolumeKg: number;
  exercises: WeeklyExerciseVolume[];
};

export type CategoryDistribution = {
  category: TrainingCategory;
  completedSets: number;
  percentage: number;
};

export type OlympicTotalPoint = {
  date: string;
  snatchKg: number;
  cleanAndJerkKg: number;
  totalKg: number;
};

export type AdvancedStatistics = {
  weeklyVolume: WeeklyVolume[];
  averageIntensityPercentage: number | null;
  intensityCoveredSets: number;
  loadedCompletedSets: number;
  distribution: CategoryDistribution[];
  olympicTotal: OlympicTotalPoint[];
  bodyWeightRatios: Partial<Record<LiftType | 'olympic_total', number>>;
};

const categories: TrainingCategory[] = ['strength', 'technique', 'mobility'];

export function classifyTrainingCategory(category: string): TrainingCategory {
  if (category === 'mobility') return 'mobility';
  if (category === 'strength') return 'strength';
  return 'technique';
}

function round(value: number, digits = 1) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function weekStart(value: string) {
  const date = new Date(value);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
}

function latestRecordAtOrBefore(records: LiftRecord[], lift: LiftType, date: string) {
  return records.reduce<LiftRecord | null>((latest, record) => {
    if (record.lift !== lift || record.achievedOn > date) return latest;
    return !latest || record.achievedOn > latest.achievedOn ? record : latest;
  }, null);
}

export function calculateAdvancedStatistics(
  history: CompletedWorkout[],
  records: LiftRecord[],
  bodyWeightKg: number | null,
): AdvancedStatistics {
  const weeks = new Map<string, Map<string, WeeklyExerciseVolume>>();
  const categoryCounts = new Map<TrainingCategory, number>(categories.map((category) => [category, 0]));
  let weightedIntensity = 0;
  let intensityRepetitions = 0;
  let intensityCoveredSets = 0;
  let loadedCompletedSets = 0;

  for (const session of history) {
    const sessionDate = session.completedAt.slice(0, 10);
    const sessionWeek = weekStart(session.completedAt);
    for (const set of session.sets) {
      if (set.result !== 'success') continue;
      categoryCounts.set(set.category, (categoryCounts.get(set.category) ?? 0) + 1);

      const volumeKg = set.weight * set.reps;
      if (volumeKg > 0) {
        const exerciseVolumes = weeks.get(sessionWeek) ?? new Map<string, WeeklyExerciseVolume>();
        const exercise = exerciseVolumes.get(set.exerciseId) ?? {
          exerciseId: set.exerciseId,
          exerciseName: set.exerciseName,
          volumeKg: 0,
        };
        exercise.volumeKg += volumeKg;
        exerciseVolumes.set(set.exerciseId, exercise);
        weeks.set(sessionWeek, exerciseVolumes);
        loadedCompletedSets += 1;
      }

      if (set.weight > 0 && set.referenceLift) {
        const reference = latestRecordAtOrBefore(records, set.referenceLift, sessionDate);
        if (reference?.weightKg) {
          weightedIntensity += set.weight / reference.weightKg * 100 * set.reps;
          intensityRepetitions += set.reps;
          intensityCoveredSets += 1;
        }
      }
    }
  }

  const weeklyVolume = [...weeks.entries()]
    .map(([start, exerciseMap]) => {
      const exercises = [...exerciseMap.values()]
        .map((exercise) => ({ ...exercise, volumeKg: round(exercise.volumeKg) }))
        .sort((left, right) => right.volumeKg - left.volumeKg || left.exerciseName.localeCompare(right.exerciseName));
      return {
        weekStart: start,
        totalVolumeKg: round(exercises.reduce((sum, exercise) => sum + exercise.volumeKg, 0)),
        exercises,
      };
    })
    .sort((left, right) => right.weekStart.localeCompare(left.weekStart));

  const completedSetCount = [...categoryCounts.values()].reduce((sum, count) => sum + count, 0);
  const distribution = categories.map((category) => ({
    category,
    completedSets: categoryCounts.get(category) ?? 0,
    percentage: completedSetCount ? round((categoryCounts.get(category) ?? 0) / completedSetCount * 100) : 0,
  }));

  const olympicDates = [...new Set(records
    .filter((record) => record.lift === 'snatch' || record.lift === 'clean_and_jerk')
    .map((record) => record.achievedOn))]
    .sort();
  const olympicTotal = olympicDates.flatMap((date): OlympicTotalPoint[] => {
    const snatch = latestRecordAtOrBefore(records, 'snatch', date);
    const cleanAndJerk = latestRecordAtOrBefore(records, 'clean_and_jerk', date);
    if (!snatch || !cleanAndJerk) return [];
    return [{
      date,
      snatchKg: snatch.weightKg,
      cleanAndJerkKg: cleanAndJerk.weightKg,
      totalKg: snatch.weightKg + cleanAndJerk.weightKg,
    }];
  });

  const bodyWeightRatios: AdvancedStatistics['bodyWeightRatios'] = {};
  if (bodyWeightKg && bodyWeightKg > 0) {
    const latest = latestLiftRecords(records);
    for (const [lift, record] of latest.entries()) {
      bodyWeightRatios[lift] = round(record.weightKg / bodyWeightKg, 2);
    }
    const snatch = latest.get('snatch');
    const cleanAndJerk = latest.get('clean_and_jerk');
    if (snatch && cleanAndJerk) {
      bodyWeightRatios.olympic_total = round((snatch.weightKg + cleanAndJerk.weightKg) / bodyWeightKg, 2);
    }
  }

  return {
    weeklyVolume,
    averageIntensityPercentage: intensityRepetitions ? round(weightedIntensity / intensityRepetitions) : null,
    intensityCoveredSets,
    loadedCompletedSets,
    distribution,
    olympicTotal,
    bodyWeightRatios,
  };
}
