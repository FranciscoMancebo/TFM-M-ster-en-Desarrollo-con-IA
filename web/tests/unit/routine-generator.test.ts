import { describe, expect, it } from 'vitest';
import { generateRoutineDraft } from '../../lib/workout/routine-generator';
import type {
  ExerciseLibraryItem,
  LiftRecord,
  UserProfile,
} from '../../lib/workout/types';

function exercise(slug: string): ExerciseLibraryItem {
  return {
    id: `exercise-${slug}`,
    slug,
    name: slug,
    section: 'strength',
    summary: '',
    focus: [],
    cues: [],
    equipment: [],
    unilateral: false,
    videoUrl: null,
  };
}

const profile: UserProfile = {
  userId: 'athlete-1',
  displayName: 'Atleta',
  bio: '',
  level: 'beginner',
  goals: ['technique'],
  trainingDaysPerWeek: 3,
  heightCm: 175,
  weightKg: 80,
  birthYear: 1995,
  competitionSex: 'male',
  avatarBase64: null,
  onboardingCompleted: true,
  weightliftingExperience: 'under_6_months',
  preferredLanguage: 'es',
  profileVisibility: 'private',
  showTrainingData: false,
  showProgress: false,
  showPublicRoutines: false,
  showMedia: true,
  showSocialLinks: true,
  confirmDetectedRecords: true,
      restTimerEnabled: true,
      restTimerDefaultSeconds: 120,
      restTimerSound: true,
      restTimerVibration: true,
};

const techniqueExercises = [
  'arrancada-muscular',
  'arrancada-desde-hang',
  'cargada-desde-hang',
  'jerk-pausa-dip',
  'sentadilla-overhead',
].map(exercise);

function liftRecord(lift: LiftRecord['lift'], weightKg: number): LiftRecord {
  return {
    id: `${lift}-${weightKg}`,
    lift,
    weightKg,
    achievedOn: '2026-09-25',
    source: 'manual',
  };
}

describe('generateRoutineDraft', () => {
  it('does not invent loads when the athlete has no reference result', () => {
    const result = generateRoutineDraft({
      profile,
      exercises: techniqueExercises,
      liftRecords: [],
      focus: 'technique',
      weeks: 4,
      daysPerWeek: 3,
      language: 'es',
    });

    expect(result.draft.weekPlans).toHaveLength(4);
    expect(result.draft.weekPlans[0].days).toHaveLength(3);
    expect(result.draft.weekPlans[0].days.flatMap((day) => day.exercises)
      .every((item) => item.intensityType === 'percentage' && item.intensityValue > 0)).toBe(true);
    expect(result.summary.calculatedLoads).toBe(0);
    expect(result.summary.missingLoads).toEqual(expect.arrayContaining(['snatch', 'clean_and_jerk']));
  });

  it('calculates percentages from the correct lifts and rounds to 2.5 kg', () => {
    const result = generateRoutineDraft({
      profile,
      exercises: techniqueExercises,
      liftRecords: [liftRecord('snatch', 103), liftRecord('clean_and_jerk', 121)],
      focus: 'technique',
      weeks: 4,
      daysPerWeek: 1,
      language: 'es',
    });

    const percentages = result.draft.weekPlans[0].days[0].exercises.map((item) => item.intensityValue);
    expect(percentages).toEqual([45, 55, 55, 45]);
    expect(result.summary).toEqual({ knownLoads: 2, calculatedLoads: 4, missingLoads: [] });
  });

  it('uses simpler variants for an athlete at starter level', () => {
    const starterProfile = { ...profile, level: 'starter' as const, weightliftingExperience: 'never' as const };
    const competitionExercises = [
      'arrancada',
      'arrancada-potencia',
      'dos-tiempos',
      'cargada-desde-hang',
      'sentadilla-frontal',
      'tiron-arrancada',
      'jerk-desde-rack',
    ].map(exercise);

    const result = generateRoutineDraft({
      profile: starterProfile,
      exercises: competitionExercises,
      liftRecords: [],
      focus: 'competition',
      weeks: 3,
      daysPerWeek: 1,
      language: 'es',
    });

    const selected = result.draft.weekPlans[0].days[0].exercises.map((item) => item.exerciseName);
    expect(selected).toContain('arrancada-potencia');
    expect(selected).toContain('cargada-desde-hang');
    expect(selected).not.toContain('arrancada');
    expect(selected).not.toContain('dos-tiempos');
  });

  it('clamps the generated schedule between one and seven days', () => {
    const tooFew = generateRoutineDraft({
      profile,
      exercises: techniqueExercises,
      liftRecords: [],
      focus: 'technique',
      weeks: 4,
      daysPerWeek: 0,
      language: 'en',
    });
    const tooMany = generateRoutineDraft({
      profile,
      exercises: techniqueExercises,
      liftRecords: [],
      focus: 'technique',
      weeks: 4,
      daysPerWeek: 9,
      language: 'en',
    });

    expect(tooFew.draft.weekPlans[0].days).toHaveLength(1);
    expect(tooFew.draft.daysPerWeek).toBe(1);
    expect(tooMany.draft.weekPlans[0].days).toHaveLength(7);
    expect(tooMany.draft.daysPerWeek).toBe(7);
  });
});
