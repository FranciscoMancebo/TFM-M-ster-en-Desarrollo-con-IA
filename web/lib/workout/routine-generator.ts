import { latestLiftRecords, liftDefinitions } from './lifts';
import type {
  AthleteLevel,
  ExerciseLibraryItem,
  Language,
  LiftRecord,
  LiftType,
  RoutineEditorDraft,
  RoutineDayDraft,
  RoutineExerciseDraft,
  RoutineFocus,
  UserProfile,
} from './types';
import { createTrainingWeeks, defaultDeloadReduction } from './training-blocks';

type ExerciseRule = {
  slugs: string[];
  sets: number;
  repetitions: number;
  percentage?: number;
  referenceLift?: LiftType;
  restSeconds: number;
  noteEs: string;
  noteEn: string;
};

const levelLoadFactor: Record<AthleteLevel, number> = {
  starter: -10,
  beginner: 0,
  intermediate: 7,
  advanced: 12,
};

const focusRules: Record<RoutineFocus, ExerciseRule[]> = {
  technique: [
    { slugs: ['arrancada-muscular', 'arrancada-cadera'], sets: 4, repetitions: 3, percentage: 45, referenceLift: 'snatch', restSeconds: 90, noteEs: 'Trayectoria y finalización antes que carga.', noteEn: 'Prioritise bar path and finish over load.' },
    { slugs: ['arrancada-desde-hang', 'arrancada-pausa-hang'], sets: 4, repetitions: 3, percentage: 55, referenceLift: 'snatch', restSeconds: 120, noteEs: 'Mantén el equilibrio en medio pie.', noteEn: 'Stay balanced over the mid-foot.' },
    { slugs: ['cargada-desde-hang', 'cargada-pausa-hang'], sets: 4, repetitions: 3, percentage: 55, referenceLift: 'clean_and_jerk', restSeconds: 120, noteEs: 'Extensión vertical y codos rápidos.', noteEn: 'Vertical extension and fast elbows.' },
    { slugs: ['jerk-pausa-dip', 'balance-jerk', 'tall-jerk'], sets: 4, repetitions: 3, percentage: 45, referenceLift: 'clean_and_jerk', restSeconds: 120, noteEs: 'Dip vertical y recepción estable.', noteEn: 'Vertical dip and stable receiving position.' },
    { slugs: ['sentadilla-overhead', 'press-sots'], sets: 3, repetitions: 5, percentage: 35, referenceLift: 'snatch', restSeconds: 90, noteEs: 'Trabaja solo en un rango estable.', noteEn: 'Work only through a stable range.' },
  ],
  strength: [
    { slugs: ['sentadilla', 'sentadilla-pausa'], sets: 5, repetitions: 5, percentage: 65, referenceLift: 'back_squat', restSeconds: 180, noteEs: 'Reserva dos repeticiones en recámara.', noteEn: 'Keep two repetitions in reserve.' },
    { slugs: ['sentadilla-frontal', 'sentadilla-frontal-pausa'], sets: 4, repetitions: 4, percentage: 65, referenceLift: 'front_squat', restSeconds: 180, noteEs: 'Codos altos y torso vertical.', noteEn: 'Keep the elbows high and torso upright.' },
    { slugs: ['tiron-arrancada', 'peso-muerto-arrancada'], sets: 4, repetitions: 3, percentage: 85, referenceLift: 'snatch', restSeconds: 150, noteEs: 'Conserva las posiciones del movimiento completo.', noteEn: 'Preserve the positions of the full lift.' },
    { slugs: ['tiron-cargada', 'peso-muerto-cargada'], sets: 4, repetitions: 3, percentage: 85, referenceLift: 'clean_and_jerk', restSeconds: 150, noteEs: 'Empuja el suelo y mantén la barra cerca.', noteEn: 'Push through the floor and keep the bar close.' },
    { slugs: ['press-estricto', 'push-press'], sets: 4, repetitions: 5, restSeconds: 120, noteEs: 'Elige una carga sólida sin perder la línea vertical.', noteEn: 'Choose a solid load without losing the vertical line.' },
  ],
  mobility: [
    { slugs: ['squat-to-stand', 'prying-squat'], sets: 3, repetitions: 8, restSeconds: 45, noteEs: 'Movimiento lento, controlado y sin dolor.', noteEn: 'Move slowly, with control and without pain.' },
    { slugs: ['movilidad-tobillo-pared'], sets: 3, repetitions: 10, restSeconds: 30, noteEs: 'Mantén el talón apoyado.', noteEn: 'Keep the heel grounded.' },
    { slugs: ['cadera-90-90', 'sentadilla-cosaca'], sets: 3, repetitions: 8, restSeconds: 45, noteEs: 'No fuerces el rango disponible.', noteEn: 'Do not force the available range.' },
    { slugs: ['extension-toracica', 'estiramiento-dorsal-overhead'], sets: 3, repetitions: 8, restSeconds: 30, noteEs: 'Respira y evita compensar con la zona lumbar.', noteEn: 'Breathe and avoid compensating through the lower back.' },
    { slugs: ['movilidad-rack-frontal', 'movilidad-muneca'], sets: 3, repetitions: 10, restSeconds: 30, noteEs: 'Progresión suave para mejorar el rack frontal.', noteEn: 'Use a gentle progression to improve the front rack.' },
  ],
  competition: [
    { slugs: ['arrancada', 'arrancada-potencia'], sets: 5, repetitions: 2, percentage: 70, referenceLift: 'snatch', restSeconds: 180, noteEs: 'Todos los intentos deben ser técnicamente repetibles.', noteEn: 'Every attempt should be technically repeatable.' },
    { slugs: ['dos-tiempos', 'complejo-cargada-jerk'], sets: 5, repetitions: 2, percentage: 70, referenceLift: 'clean_and_jerk', restSeconds: 210, noteEs: 'Recupera la cargada antes de preparar el jerk.', noteEn: 'Recover the clean before setting up the jerk.' },
    { slugs: ['sentadilla-frontal', 'sentadilla-frontal-pausa'], sets: 4, repetitions: 3, percentage: 72, referenceLift: 'front_squat', restSeconds: 180, noteEs: 'Refuerza una recuperación sólida de la cargada.', noteEn: 'Build a solid recovery from the clean.' },
    { slugs: ['tiron-arrancada', 'tiron-arrancada-pausa'], sets: 4, repetitions: 3, percentage: 90, referenceLift: 'snatch', restSeconds: 150, noteEs: 'Misma salida y trayectoria que en la arrancada.', noteEn: 'Use the same start and bar path as the snatch.' },
    { slugs: ['jerk-desde-rack', 'jerk-pausa-dip'], sets: 4, repetitions: 2, percentage: 75, referenceLift: 'clean_and_jerk', restSeconds: 180, noteEs: 'Ensaya una preparación idéntica en cada serie.', noteEn: 'Use an identical setup for every set.' },
  ],
};

function closestPlateLoad(value: number) {
  return Math.max(0, Math.round(value / 2.5) * 2.5);
}

function liftLabel(lift: LiftType, language: Language) {
  const definition = liftDefinitions.find((item) => item.id === lift);
  if (!definition) return lift;
  if (language === 'en') {
    if (lift === 'back_squat') return 'back squat';
    if (lift === 'front_squat') return 'front squat';
    if (lift === 'snatch') return 'snatch';
    return 'clean and jerk';
  }
  return definition.shortLabel.toLowerCase();
}

function rulesForLevel(focus: RoutineFocus, level: AthleteLevel) {
  const count = level === 'starter' ? 4 : level === 'beginner' ? 4 : 5;
  const base = focusRules[focus].slice(0, count);
  if (level !== 'starter' || focus === 'mobility') return base;

  // The first contact avoids full competition movements and prioritises simpler variants.
  return base.map((rule) => {
    if (rule.slugs[0] === 'arrancada') return { ...rule, slugs: ['arrancada-potencia', 'arrancada-desde-hang'] };
    if (rule.slugs[0] === 'dos-tiempos') return { ...rule, slugs: ['cargada-desde-hang', 'cargada-potencia'] };
    return rule;
  });
}

export type RoutineGenerationSummary = {
  knownLoads: number;
  calculatedLoads: number;
  missingLoads: LiftType[];
};

export function generateRoutineDraft({
  profile,
  exercises,
  liftRecords,
  focus,
  weeks,
  daysPerWeek,
  language,
}: {
  profile: UserProfile;
  exercises: ExerciseLibraryItem[];
  liftRecords: LiftRecord[];
  focus: RoutineFocus;
  weeks: number;
  daysPerWeek: number;
  language: Language;
}): { draft: RoutineEditorDraft; summary: RoutineGenerationSummary } {
  const latest = latestLiftRecords(liftRecords);
  const missingLoads = new Set<LiftType>();
  let calculatedLoads = 0;
  const rules = rulesForLevel(focus, profile.level);

  function exerciseFromRule(rule: ExerciseRule): RoutineExerciseDraft[] {
    const libraryExercise = rule.slugs
      .map((slug) => exercises.find((exercise) => exercise.slug === slug))
      .find((exercise): exercise is ExerciseLibraryItem => Boolean(exercise));
    if (!libraryExercise) return [];

    const reference = rule.referenceLift ? latest.get(rule.referenceLift) : undefined;
    const adjustedPercentage = rule.percentage === undefined
      ? undefined
      : Math.max(30, Math.min(95, rule.percentage + levelLoadFactor[profile.level]));
    const calculatedLoad = reference && adjustedPercentage !== undefined
      ? closestPlateLoad(reference.weightKg * adjustedPercentage / 100)
      : 0;
    if (calculatedLoad > 0) calculatedLoads += 1;
    if (rule.referenceLift && !reference) missingLoads.add(rule.referenceLift);

    const calculationNote = rule.referenceLift && adjustedPercentage !== undefined
      ? reference
        ? language === 'es'
          ? `${adjustedPercentage} % de tu ${liftLabel(rule.referenceLift, language)} (${reference.weightKg} kg): ${calculatedLoad} kg.`
          : `${adjustedPercentage}% of your ${liftLabel(rule.referenceLift, language)} (${reference.weightKg} kg): ${calculatedLoad} kg.`
        : language === 'es'
          ? `Sin marca de ${liftLabel(rule.referenceLift, language)}: empieza con barra vacía o una carga técnica cómoda.`
          : `No ${liftLabel(rule.referenceLift, language)} result: start with an empty bar or a comfortable technical load.`
      : language === 'es'
        ? 'Carga libre: empieza sin peso y progresa solo si mantienes el control.'
        : 'Free load: start unloaded and progress only while maintaining control.';

    return [{
      exerciseId: libraryExercise.id,
      exerciseName: libraryExercise.name,
      sets: rule.sets,
      repetitions: rule.repetitions,
      intensityType: adjustedPercentage === undefined ? 'load' : 'percentage',
      intensityValue: adjustedPercentage ?? 0,
      restSeconds: rule.restSeconds,
      notes: `${language === 'es' ? rule.noteEs : rule.noteEn} ${calculationNote}`,
    }];
  }

  const focusLabel = language === 'es'
    ? { technique: 'Técnica', strength: 'Fuerza', mobility: 'Movilidad', competition: 'Competición' }[focus]
    : { technique: 'Technique', strength: 'Strength', mobility: 'Mobility', competition: 'Competition' }[focus];
  const levelLabel = language === 'es'
    ? { starter: 'iniciación', beginner: 'principiante', intermediate: 'intermedio', advanced: 'avanzado' }[profile.level]
    : { starter: 'starter', beginner: 'beginner', intermediate: 'intermediate', advanced: 'advanced' }[profile.level];
  const safeDayCount = Math.max(1, Math.min(7, daysPerWeek));
  const rulesPerDay = Math.min(4, rules.length);
  const generatedDays: RoutineDayDraft[] = Array.from({ length: safeDayCount }, (_, dayIndex) => {
    const dayRules = Array.from({ length: rulesPerDay }, (__, offset) => rules[(dayIndex * 2 + offset) % rules.length]);
    return {
      name: language === 'es' ? `Día ${dayIndex + 1} · ${focusLabel}` : `Day ${dayIndex + 1} · ${focusLabel}`,
      exercises: dayRules.flatMap(exerciseFromRule),
    };
  });

  return {
    draft: {
      routineId: null,
      title: language === 'es' ? `${focusLabel} · nivel ${levelLabel}` : `${focusLabel} · ${levelLabel} level`,
      description: language === 'es'
        ? `Propuesta creada con reglas para tu nivel ${levelLabel}, ${daysPerWeek} días disponibles y tus marcas actuales. Revisa cada carga antes de entrenar.`
        : `Rule-based proposal for your ${levelLabel} level, ${daysPerWeek} available days and current results. Review every load before training.`,
      level: profile.level,
      focus,
      weeks,
      daysPerWeek: safeDayCount,
      visibility: 'private',
      deloadWeek: weeks >= 3 ? weeks : null,
      deloadReduction: defaultDeloadReduction,
      weekPlans: createTrainingWeeks(generatedDays, weeks),
    },
    summary: {
      knownLoads: latest.size,
      calculatedLoads,
      missingLoads: [...missingLoads],
    },
  };
}
