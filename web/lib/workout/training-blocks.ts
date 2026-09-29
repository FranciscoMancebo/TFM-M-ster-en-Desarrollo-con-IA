import type { RoutineDayDraft, RoutineWeekDraft, TrainingBlockPhase } from './types';

export const defaultDeloadReduction = 15;

function cloneDays(days: RoutineDayDraft[], adjustment: number): RoutineDayDraft[] {
  return days.map((day) => ({
    ...day,
    exercises: day.exercises.map((exercise) => ({
      ...exercise,
      intensityValue: exercise.intensityType === 'percentage'
        ? Math.max(0, Math.min(100, exercise.intensityValue + adjustment))
        : exercise.intensityValue,
    })),
  }));
}

export function phaseForWeek(
  weekNumber: number,
  totalWeeks: number,
  deloadWeek: number | null,
): TrainingBlockPhase {
  if (deloadWeek === weekNumber) return 'deload';
  const workingWeeks = Array.from({ length: totalWeeks }, (_, index) => index + 1)
    .filter((week) => week !== deloadWeek);
  const position = workingWeeks.indexOf(weekNumber);
  const accumulationCount = Math.max(1, Math.ceil(workingWeeks.length * 0.6));
  return position < accumulationCount ? 'accumulation' : 'intensification';
}

export function adjustmentForWeek(
  weekNumber: number,
  totalWeeks: number,
  deloadWeek: number | null,
  deloadReduction: number,
) {
  const phase = phaseForWeek(weekNumber, totalWeeks, deloadWeek);
  if (phase === 'deload') return -Math.abs(deloadReduction);

  const phaseWeeks = Array.from({ length: totalWeeks }, (_, index) => index + 1)
    .filter((week) => phaseForWeek(week, totalWeeks, deloadWeek) === phase);
  const position = phaseWeeks.indexOf(weekNumber);
  return phase === 'accumulation' ? position * 2 : 5 + position * 2;
}

export function createTrainingWeeks(
  baseDays: RoutineDayDraft[],
  totalWeeks: number,
  deloadWeek: number | null = totalWeeks >= 3 ? totalWeeks : null,
  deloadReduction = defaultDeloadReduction,
): RoutineWeekDraft[] {
  const safeWeeks = Math.max(1, Math.min(52, Math.round(totalWeeks)));
  const safeDeloadWeek = deloadWeek && deloadWeek <= safeWeeks ? deloadWeek : null;
  const safeReduction = Math.max(5, Math.min(40, Math.abs(deloadReduction)));

  return Array.from({ length: safeWeeks }, (_, index) => {
    const weekNumber = index + 1;
    const phase = phaseForWeek(weekNumber, safeWeeks, safeDeloadWeek);
    const percentageAdjustment = adjustmentForWeek(
      weekNumber,
      safeWeeks,
      safeDeloadWeek,
      safeReduction,
    );
    return {
      weekNumber,
      phase,
      percentageAdjustment,
      days: cloneDays(baseDays, percentageAdjustment),
    };
  });
}

export function rebaseWeekPercentage(
  week: RoutineWeekDraft,
  nextAdjustment: number,
): RoutineWeekDraft {
  const delta = nextAdjustment - week.percentageAdjustment;
  return {
    ...week,
    percentageAdjustment: nextAdjustment,
    days: cloneDays(week.days, delta),
  };
}
