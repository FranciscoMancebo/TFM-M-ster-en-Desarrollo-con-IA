import { describe, expect, it } from 'vitest';
import { detectPerformanceDrop, estimateOneRepMax } from '@/lib/workout/performance';
import type { CompletedWorkout } from '@/lib/workout/types';

function session(performancePercentage: number, id: string): CompletedWorkout {
  return {
    id,
    routineName: 'Rutina',
    dayName: 'Día',
    completedAt: '2026-09-28T10:00:00Z',
    durationSeconds: 3600,
    completedSets: 4,
    failedSets: 0,
    omittedSets: 0,
    volumeKg: performancePercentage * 10,
    plannedVolumeKg: 1000,
    performancePercentage,
    averageRpe: 7.5,
    painLevel: 0,
    fatigueLevel: 4,
    overallFeeling: 'good',
    sets: [],
  };
}

describe('estimateOneRepMax', () => {
  it('keeps an actual single unchanged', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });

  it('uses the Epley estimate for rep records', () => {
    expect(estimateOneRepMax(100, 3)).toBe(110);
    expect(estimateOneRepMax(90, 5)).toBe(105);
  });
});

describe('detectPerformanceDrop', () => {
  it('warns after three consecutive declines totalling at least ten points', () => {
    const result = detectPerformanceDrop([
      session(82, 'newest'),
      session(89, 'middle'),
      session(96, 'oldest'),
    ]);
    expect(result.active).toBe(true);
    expect(result.dropPercentagePoints).toBe(14);
    expect(result.recentPercentages).toEqual([96, 89, 82]);
  });

  it('does not warn for a recovery or insufficient history', () => {
    expect(detectPerformanceDrop([session(92, 'newest'), session(88, 'oldest')]).active).toBe(false);
    expect(detectPerformanceDrop([
      session(93, 'newest'),
      session(88, 'middle'),
      session(96, 'oldest'),
    ]).active).toBe(false);
  });
});
