import type { AthleteLevel, FreeSessionExerciseDraft, RoutineEditorDraft, RoutineFocus, RoutinePlan, TrainingSet } from './types';

const MAX_FREE_SESSION_EXERCISES = 12;

export function createFreeSessionPlan(
  title: string,
  drafts: FreeSessionExerciseDraft[],
  idFactory: () => string = () => crypto.randomUUID(),
): RoutinePlan {
  const cleanTitle = title.trim();
  if (cleanTitle.length < 2 || cleanTitle.length > 120) throw new Error('El título de la sesión libre no es válido.');
  if (drafts.length < 1 || drafts.length > MAX_FREE_SESSION_EXERCISES) throw new Error('Añade entre 1 y 12 ejercicios.');

  let orderIndex = 0;
  const usedExercises = new Set<string>();
  const exercises = drafts.map((draft) => {
    if (!draft.exerciseId || usedExercises.has(draft.exerciseId)) throw new Error('Cada ejercicio solo puede aparecer una vez.');
    if (!Number.isInteger(draft.sets) || draft.sets < 1 || draft.sets > 10) throw new Error('Configura entre 1 y 10 series por ejercicio.');
    if (!Number.isInteger(draft.repetitions) || draft.repetitions < 1 || draft.repetitions > 100) throw new Error('Las repeticiones deben estar entre 1 y 100.');
    if (!Number.isFinite(draft.loadKg) || draft.loadKg < 0 || draft.loadKg > 600) throw new Error('La carga debe estar entre 0 y 600 kg.');
    usedExercises.add(draft.exerciseId);

    const sets: TrainingSet[] = Array.from({ length: draft.sets }, () => ({
      id: idFactory(),
      prescriptionId: '',
      exerciseId: draft.exerciseId,
      orderIndex: ++orderIndex,
      plannedWeight: draft.loadKg,
      plannedReps: draft.repetitions,
      weight: draft.loadKg,
      reps: draft.repetitions,
      rpe: null,
      status: 'pending',
    }));

    return {
      id: draft.exerciseId,
      prescriptionId: '',
      name: draft.exerciseName,
      prescription: `${draft.sets} × ${draft.repetitions} · ${draft.loadKg} kg`,
      context: 'Sesión libre · carga editable',
      restSeconds: null,
      sets,
    };
  });

  return {
    kind: 'free_session',
    assignmentId: '',
    routineVersionId: '',
    routineDayId: '',
    title: 'Sesión libre',
    description: 'Entrenamiento personalizado creado desde el calendario.',
    dayName: cleanTitle,
    weekNumber: 1,
    dayIndex: 1,
    weeks: 1,
    daysPerWeek: 1,
    phase: 'accumulation',
    percentageAdjustment: 0,
    exercises,
  };
}

export function createRoutineDraftFromFreeSession(
  plan: RoutinePlan,
  level: AthleteLevel,
  goals: string[],
): RoutineEditorDraft {
  if (plan.kind !== 'free_session' || plan.exercises.length === 0) throw new Error('No hay una sesión libre que convertir.');
  const focuses: RoutineFocus[] = ['mobility', 'strength', 'technique', 'competition'];
  const focus = goals.find((goal): goal is RoutineFocus => focuses.includes(goal as RoutineFocus)) ?? 'technique';

  return {
    routineId: null,
    title: plan.dayName,
    description: 'Rutina privada creada a partir de una sesión libre.',
    level,
    focus,
    weeks: 1,
    daysPerWeek: 1,
    visibility: 'private',
    deloadWeek: null,
    deloadReduction: 20,
    weekPlans: [{
      weekNumber: 1,
      phase: 'accumulation',
      percentageAdjustment: 0,
      days: [{
        name: plan.dayName,
        exercises: plan.exercises.map((exercise) => {
          const firstSet = exercise.sets[0];
          return {
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            sets: exercise.sets.length,
            repetitions: firstSet.plannedReps,
            intensityType: 'load' as const,
            intensityValue: firstSet.plannedWeight,
            restSeconds: 120,
            notes: 'Creada desde una sesión libre',
          };
        }),
      }],
    }],
  };
}

export async function saveFreeSessionAsRoutine(
  plan: RoutinePlan,
  level: AthleteLevel,
  goals: string[],
  userId: string,
) {
  const { workoutRepository } = await import('./repository');
  await workoutRepository.saveRoutine(createRoutineDraftFromFreeSession(plan, level, goals));
  return workoutRepository.loadRoutines(userId);
}
