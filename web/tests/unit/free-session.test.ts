import { describe, expect, it } from 'vitest';
import { createFreeSessionPlan, createRoutineDraftFromFreeSession } from '@/lib/workout/free-session';

const squat = {
  exerciseId: 'squat-id',
  exerciseName: 'Sentadilla',
  sets: 3,
  repetitions: 5,
  loadKg: 80,
};

describe('createFreeSessionPlan', () => {
  it('builds editable sets with a stable global order', () => {
    let id = 0;
    const plan = createFreeSessionPlan('Fuerza libre', [
      squat,
      { exerciseId: 'snatch-id', exerciseName: 'Arrancada', sets: 2, repetitions: 2, loadKg: 50 },
    ], () => `set-${++id}`);

    expect(plan.kind).toBe('free_session');
    expect(plan.dayName).toBe('Fuerza libre');
    expect(plan.exercises.flatMap((exercise) => exercise.sets).map((set) => set.orderIndex)).toEqual([1, 2, 3, 4, 5]);
    expect(plan.exercises[0].sets[0]).toMatchObject({ id: 'set-1', plannedWeight: 80, weight: 80, plannedReps: 5, reps: 5 });
  });

  it('rejects duplicate exercises and invalid prescriptions', () => {
    expect(() => createFreeSessionPlan('Libre', [squat, squat])).toThrow(/solo puede aparecer una vez/i);
    expect(() => createFreeSessionPlan('Libre', [{ ...squat, sets: 0 }])).toThrow(/entre 1 y 10 series/i);
    expect(() => createFreeSessionPlan('Libre', [{ ...squat, loadKg: 601 }])).toThrow(/entre 0 y 600 kg/i);
  });

  it('requires at least one exercise', () => {
    expect(() => createFreeSessionPlan('Libre', [])).toThrow(/entre 1 y 12 ejercicios/i);
  });

  it('converts a free session into a one-day private routine', () => {
    const plan = createFreeSessionPlan('Fuerza libre', [squat], () => crypto.randomUUID());
    const routine = createRoutineDraftFromFreeSession(plan, 'intermediate', ['strength']);

    expect(routine).toMatchObject({ title: 'Fuerza libre', level: 'intermediate', focus: 'strength', weeks: 1, daysPerWeek: 1, visibility: 'private' });
    expect(routine.weekPlans[0].days[0].exercises[0]).toMatchObject({ exerciseId: 'squat-id', sets: 3, repetitions: 5, intensityType: 'load', intensityValue: 80 });
  });
});
