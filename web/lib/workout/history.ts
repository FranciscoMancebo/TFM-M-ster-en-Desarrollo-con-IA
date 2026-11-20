import type { CompletedSetSummary } from './types';

export type NumberedCompletedSet = CompletedSetSummary & {
  setNumber: number;
};

export function numberWorkoutSets(sets: CompletedSetSummary[]): NumberedCompletedSet[] {
  const exerciseCounts = new Map<string, number>();

  return sets.map((set) => {
    const exerciseKey = set.exerciseId || set.exerciseSlug || set.exerciseName;
    const setNumber = (exerciseCounts.get(exerciseKey) ?? 0) + 1;
    exerciseCounts.set(exerciseKey, setNumber);
    return { ...set, setNumber };
  });
}
