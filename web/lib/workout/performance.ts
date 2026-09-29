import type { CompletedWorkout, PerformanceAlert } from './types';

export function estimateOneRepMax(weightKg: number, repetitions: number) {
  if (weightKg <= 0 || repetitions <= 0) return 0;
  if (repetitions === 1) return weightKg;
  return Math.round(weightKg * (1 + repetitions / 30) * 100) / 100;
}

export function detectPerformanceDrop(history: CompletedWorkout[]): PerformanceAlert {
  const recent = history
    .filter((session) => session.plannedVolumeKg > 0)
    .slice(0, 3)
    .reverse()
    .map((session) => session.performancePercentage);
  if (recent.length < 3) return { active: false, dropPercentagePoints: 0, recentPercentages: recent };

  const [oldest, middle, latest] = recent;
  const drop = Math.round((oldest - latest) * 10) / 10;
  return {
    active: oldest > middle && middle > latest && drop >= 10,
    dropPercentagePoints: Math.max(0, drop),
    recentPercentages: recent,
  };
}
