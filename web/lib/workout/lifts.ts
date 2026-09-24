import type { AthleteLevel, LiftRecord, LiftType, WeightliftingExperience } from './types';

export const liftDefinitions: Array<{
  id: LiftType;
  label: string;
  shortLabel: string;
}> = [
  { id: 'back_squat', label: 'Sentadilla', shortLabel: 'Sentadilla' },
  { id: 'snatch', label: 'Snatch o arrancada', shortLabel: 'Arrancada' },
  { id: 'front_squat', label: 'Sentadilla frontal', shortLabel: 'S. frontal' },
  { id: 'clean_and_jerk', label: 'Clean and jerk o dos tiempos', shortLabel: 'Dos tiempos' },
];

export function latestLiftRecords<T extends Pick<LiftRecord, 'lift' | 'achievedOn'>>(records: T[]) {
  const latest = new Map<LiftType, T>();
  for (const record of records) {
    const current = latest.get(record.lift);
    if (!current || record.achievedOn > current.achievedOn) latest.set(record.lift, record);
  }
  return latest;
}

export function todayForInput() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

const experienceScore: Record<WeightliftingExperience, number> = {
  never: 0,
  under_6_months: 1,
  six_to_twenty_four_months: 2,
  over_two_years: 3,
};

const ratioThresholds: Record<LiftType, [number, number, number]> = {
  back_squat: [1, 1.5, 2],
  front_squat: [0.8, 1.25, 1.7],
  snatch: [0.4, 0.7, 1],
  clean_and_jerk: [0.55, 0.9, 1.25],
};

export function determineAthleteLevel(
  bodyWeightKg: number | null,
  experience: WeightliftingExperience | null,
  records: LiftRecord[],
): AthleteLevel {
  if (!experience) return 'starter';
  const baseScore = experienceScore[experience];
  const latest = latestLiftRecords(records);
  const strengthScores = bodyWeightKg && bodyWeightKg > 0
    ? liftDefinitions.flatMap((lift) => {
        const record = latest.get(lift.id);
        if (!record) return [];
        const ratio = record.weightKg / bodyWeightKg;
        const thresholds = ratioThresholds[lift.id];
        return [ratio >= thresholds[2] ? 3 : ratio >= thresholds[1] ? 2 : ratio >= thresholds[0] ? 1 : 0];
      })
    : [];
  const strengthScore = strengthScores.length
    ? strengthScores.reduce((sum, score) => sum + score, 0) / strengthScores.length
    : baseScore;
  const combinedScore = Math.round(baseScore * 0.65 + strengthScore * 0.35);
  const experienceCap = experience === 'never' ? 0 : experience === 'under_6_months' ? 1 : experience === 'six_to_twenty_four_months' ? 2 : 3;
  const levels: AthleteLevel[] = ['starter', 'beginner', 'intermediate', 'advanced'];
  return levels[Math.min(combinedScore, experienceCap)];
}
