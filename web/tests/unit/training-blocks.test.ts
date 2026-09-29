import { describe, expect, it } from 'vitest';
import { createTrainingWeeks, rebaseWeekPercentage } from '../../lib/workout/training-blocks';
import type { RoutineDayDraft } from '../../lib/workout/types';

const baseDays: RoutineDayDraft[] = [{
  name: 'Día 1',
  exercises: [
    { exerciseId: 'squat', exerciseName: 'Sentadilla', sets: 4, repetitions: 3, intensityType: 'percentage', intensityValue: 70, restSeconds: 180, notes: '' },
    { exerciseId: 'mobility', exerciseName: 'Movilidad', sets: 3, repetitions: 8, intensityType: 'load', intensityValue: 10, restSeconds: 30, notes: '' },
  ],
}];

describe('training blocks', () => {
  it('creates accumulation, intensification and a configurable deload', () => {
    const weeks = createTrainingWeeks(baseDays, 6, 6, 15);

    expect(weeks.map((week) => week.phase)).toEqual([
      'accumulation', 'accumulation', 'accumulation',
      'intensification', 'intensification', 'deload',
    ]);
    expect(weeks.map((week) => week.percentageAdjustment)).toEqual([0, 2, 4, 5, 7, -15]);
    expect(weeks.map((week) => week.days[0].exercises[0].intensityValue)).toEqual([70, 72, 74, 75, 77, 55]);
  });

  it('never changes exercises prescribed with an absolute load', () => {
    const weeks = createTrainingWeeks(baseDays, 4, 4, 20);
    expect(weeks.every((week) => week.days[0].exercises[1].intensityValue === 10)).toBe(true);
  });

  it('rebases a manually edited week without accumulating rounding errors', () => {
    const week = createTrainingWeeks(baseDays, 2, null)[1];
    const rebased = rebaseWeekPercentage(week, -10);

    expect(rebased.days[0].exercises[0].intensityValue).toBe(60);
    expect(rebased.days[0].exercises[1].intensityValue).toBe(10);
  });
});
