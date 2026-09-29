import { describe, expect, it } from 'vitest';
import { calculateAdvancedStatistics, classifyTrainingCategory } from '@/lib/workout/statistics';
import type { CompletedSetSummary, CompletedWorkout, LiftRecord } from '@/lib/workout/types';

const records: LiftRecord[] = [
  { id: 's1', lift: 'snatch', weightKg: 70, achievedOn: '2026-09-01', source: 'manual' },
  { id: 'c1', lift: 'clean_and_jerk', weightKg: 90, achievedOn: '2026-09-01', source: 'manual' },
  { id: 'b1', lift: 'back_squat', weightKg: 120, achievedOn: '2026-09-01', source: 'manual' },
  { id: 'f1', lift: 'front_squat', weightKg: 100, achievedOn: '2026-09-01', source: 'manual' },
  { id: 's2', lift: 'snatch', weightKg: 75, achievedOn: '2026-09-25', source: 'workout' },
  { id: 'c2', lift: 'clean_and_jerk', weightKg: 95, achievedOn: '2026-09-27', source: 'workout' },
];

function set(overrides: Partial<CompletedSetSummary> = {}): CompletedSetSummary {
  return {
    exerciseId: 'squat',
    exerciseName: 'Sentadilla',
    exerciseSlug: 'sentadilla',
    category: 'strength',
    referenceLift: 'back_squat',
    plannedWeight: 100,
    plannedReps: 3,
    weight: 100,
    reps: 3,
    rpe: 8,
    result: 'success',
    ...overrides,
  };
}

function session(id: string, completedAt: string, sets: CompletedSetSummary[]): CompletedWorkout {
  const successful = sets.filter((item) => item.result === 'success');
  return {
    id,
    routineName: 'Rutina',
    dayName: 'Día',
    completedAt,
    durationSeconds: 3600,
    completedSets: successful.length,
    failedSets: sets.filter((item) => item.result === 'miss').length,
    omittedSets: sets.filter((item) => item.result === 'skipped').length,
    volumeKg: successful.reduce((sum, item) => sum + item.weight * item.reps, 0),
    plannedVolumeKg: sets.reduce((sum, item) => sum + item.plannedWeight * item.plannedReps, 0),
    performancePercentage: 100,
    averageRpe: 8,
    painLevel: 0,
    fatigueLevel: 4,
    overallFeeling: 'good',
    sets,
  };
}

const history = [
  session('new', '2026-09-29T10:00:00Z', [
    set({ weight: 105 }),
    set({ exerciseId: 'snatch', exerciseName: 'Arrancada', exerciseSlug: 'arrancada', category: 'technique', referenceLift: 'snatch', weight: 70, reps: 2 }),
  ]),
  session('old', '2026-09-22T10:00:00Z', [
    set(),
    set({ exerciseId: 'snatch', exerciseName: 'Arrancada', exerciseSlug: 'arrancada', category: 'technique', referenceLift: 'snatch', weight: 60, reps: 2 }),
    set({ exerciseId: 'mobility', exerciseName: 'Movilidad de tobillo', exerciseSlug: 'movilidad-tobillo-pared', category: 'mobility', referenceLift: null, plannedWeight: 0, weight: 0, reps: 8 }),
    set({ exerciseId: 'failed', exerciseName: 'Tirón', exerciseSlug: 'tiron-arrancada', category: 'technique', referenceLift: 'snatch', weight: 100, result: 'miss' }),
  ]),
];

describe('calculateAdvancedStatistics', () => {
  it('maps strength and mobility explicitly and treats Olympic categories as technique', () => {
    expect(classifyTrainingCategory('strength')).toBe('strength');
    expect(classifyTrainingCategory('mobility')).toBe('mobility');
    expect(classifyTrainingCategory('snatch')).toBe('technique');
    expect(classifyTrainingCategory('competition')).toBe('technique');
  });

  it('groups successful volume by exercise and Monday-based week', () => {
    const result = calculateAdvancedStatistics(history, records, 80);

    expect(result.weeklyVolume).toHaveLength(2);
    expect(result.weeklyVolume[0]).toMatchObject({ weekStart: '2026-09-28', totalVolumeKg: 455 });
    expect(result.weeklyVolume[0].exercises).toEqual([
      expect.objectContaining({ exerciseName: 'Sentadilla', volumeKg: 315 }),
      expect.objectContaining({ exerciseName: 'Arrancada', volumeKg: 140 }),
    ]);
    expect(result.weeklyVolume[1]).toMatchObject({ weekStart: '2026-09-21', totalVolumeKg: 420 });
  });

  it('calculates repetition-weighted intensity using the reference valid on the session date', () => {
    const result = calculateAdvancedStatistics(history, records, 80);

    expect(result.averageIntensityPercentage).toBe(87.1);
    expect(result.intensityCoveredSets).toBe(4);
    expect(result.loadedCompletedSets).toBe(4);
  });

  it('distributes completed sets without excluding zero-load mobility work', () => {
    const result = calculateAdvancedStatistics(history, records, 80);

    expect(result.distribution).toEqual([
      { category: 'strength', completedSets: 2, percentage: 40 },
      { category: 'technique', completedSets: 2, percentage: 40 },
      { category: 'mobility', completedSets: 1, percentage: 20 },
    ]);
  });

  it('builds the historical Olympic total from the latest result available on each date', () => {
    const result = calculateAdvancedStatistics(history, records, 80);

    expect(result.olympicTotal).toEqual([
      { date: '2026-09-01', snatchKg: 70, cleanAndJerkKg: 90, totalKg: 160 },
      { date: '2026-09-25', snatchKg: 75, cleanAndJerkKg: 90, totalKg: 165 },
      { date: '2026-09-27', snatchKg: 75, cleanAndJerkKg: 95, totalKg: 170 },
    ]);
  });

  it('relates the latest canonical records and Olympic total to body weight', () => {
    const result = calculateAdvancedStatistics(history, records, 80);

    expect(result.bodyWeightRatios).toEqual({
      back_squat: 1.5,
      front_squat: 1.25,
      snatch: 0.94,
      clean_and_jerk: 1.19,
      olympic_total: 2.13,
    });
  });

  it('returns explicit empty metrics when references, sessions or body weight are missing', () => {
    const result = calculateAdvancedStatistics([], [], null);

    expect(result.weeklyVolume).toEqual([]);
    expect(result.averageIntensityPercentage).toBeNull();
    expect(result.olympicTotal).toEqual([]);
    expect(result.bodyWeightRatios).toEqual({});
    expect(result.distribution.every((item) => item.percentage === 0)).toBe(true);
  });
});
