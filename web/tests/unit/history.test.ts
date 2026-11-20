import { describe, expect, it } from 'vitest';
import { numberWorkoutSets } from '@/lib/workout/history';
import type { CompletedSetSummary } from '@/lib/workout/types';

function completedSet(overrides: Partial<CompletedSetSummary> = {}): CompletedSetSummary {
  return {
    exerciseId: 'squat',
    exerciseName: 'Sentadilla trasera',
    exerciseSlug: 'back-squat',
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

describe('numberWorkoutSets', () => {
  it('numbers sets independently for each exercise while preserving order', () => {
    const rows = numberWorkoutSets([
      completedSet(),
      completedSet({ exerciseId: 'snatch', exerciseName: 'Arrancada', exerciseSlug: 'snatch' }),
      completedSet(),
    ]);

    expect(rows.map((row) => [row.exerciseName, row.setNumber])).toEqual([
      ['Sentadilla trasera', 1],
      ['Arrancada', 1],
      ['Sentadilla trasera', 2],
    ]);
  });

  it('uses the slug as a stable fallback when an exercise id is absent', () => {
    const rows = numberWorkoutSets([
      completedSet({ exerciseId: '' }),
      completedSet({ exerciseId: '' }),
    ]);

    expect(rows.map((row) => row.setNumber)).toEqual([1, 2]);
  });

  it('does not mutate the original set summaries', () => {
    const set = completedSet();
    const rows = numberWorkoutSets([set]);

    expect(rows[0]).not.toBe(set);
    expect(set).not.toHaveProperty('setNumber');
  });
});
