import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import type {
  ActiveWorkout,
  CompletedWorkout,
  CommunityRoutine,
  Exercise,
  ExerciseRecord,
  ExerciseLibraryItem,
  ExerciseSection,
  LiftRecord,
  LiftType,
  NewLiftRecord,
  RoutinePlan,
  RoutineDayDraft,
  RoutineEditorDraft,
  RoutineQuestion,
  RoutineSummary,
  SessionFeedback,
  TrainingSet,
  UserProfile,
  PublicAthleteProfile,
  AppNotification,
  GamificationProgress,
  WorkoutPersonalBest,
  AdherenceOverview,
  CalendarEventStatus,
  CalendarRoutineDay,
  NewTrainingCalendarEvent,
  TrainingCalendarEvent,
} from './types';
import { latestLiftRecords } from './lifts';
import { classifyTrainingCategory } from './statistics';
import { createTrainingWeeks, defaultDeloadReduction } from './training-blocks';

type DatabaseError = { message: string } | null;
type PageResult<T> = { items: T[]; hasMore: boolean };

function client(): SupabaseClient {
  return getSupabaseClient();
}

function requireData<T>(data: T | null, error: DatabaseError): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('No se encontraron los datos solicitados.');
  return data;
}

function textValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function optionalTextValue(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function resultFromStatus(status: TrainingSet['status']) {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'miss';
  return 'skipped';
}

function statusFromResult(result: string): TrainingSet['status'] {
  if (result === 'success') return 'completed';
  if (result === 'miss') return 'failed';
  return 'pending';
}

const liftByExerciseSlug: Record<string, LiftType | undefined> = {
  sentadilla: 'back_squat',
  arrancada: 'snatch',
  'sentadilla-frontal': 'front_squat',
  'dos-tiempos': 'clean_and_jerk',
};

function referenceLiftFromSlug(slug: string): LiftType | undefined {
  if (liftByExerciseSlug[slug]) return liftByExerciseSlug[slug];
  if (slug.includes('arrancada') || slug === 'snatch-balance' || slug === 'tall-snatch' || slug === 'sentadilla-overhead') return 'snatch';
  if (slug.includes('sentadilla-frontal')) return 'front_squat';
  if (slug.includes('dos-tiempos') || slug.includes('cargada') || slug.includes('jerk') || slug === 'push-press') return 'clean_and_jerk';
  if (slug.includes('sentadilla')) return 'back_squat';
  return undefined;
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

type InitialExercise = {
  exerciseId: string;
  sets: number;
  repetitions: number;
  intensity: number;
  referenceExerciseId: string | null;
  restSeconds: number;
  notes: string;
};

const initialRoutineByLevel: Record<UserProfile['level'], {
  title: string;
  description: string;
  dayName: string;
  exercises: InitialExercise[];
}> = {
  starter: {
    title: 'Fundamentos de halterofilia',
    description: 'Primer contacto con las posiciones básicas y el control de la barra.',
    dayName: 'Fundamentos',
    exercises: [
      { exerciseId: '00000000-0000-4000-8000-000000000006', sets: 4, repetitions: 5, intensity: 0, referenceExerciseId: null, restSeconds: 90, notes: 'Empieza con una barra vacía o una carga técnica cómoda' },
      { exerciseId: '00000000-0000-4000-8000-000000000003', sets: 4, repetitions: 4, intensity: 60, referenceExerciseId: '00000000-0000-4000-8000-000000000003', restSeconds: 120, notes: 'Prioriza profundidad y control' },
      { exerciseId: '00000000-0000-4000-8000-000000000009', sets: 3, repetitions: 6, intensity: 0, referenceExerciseId: null, restSeconds: 90, notes: 'Elige una carga que permita mantener una trayectoria vertical' },
    ],
  },
  beginner: {
    title: 'Base técnica',
    description: 'Variantes desde hang para consolidar posiciones antes de aumentar la intensidad.',
    dayName: 'Técnica desde hang',
    exercises: [
      { exerciseId: '00000000-0000-4000-8000-000000000007', sets: 5, repetitions: 3, intensity: 60, referenceExerciseId: '00000000-0000-4000-8000-000000000001', restSeconds: 120, notes: 'Recepción estable y extensión completa' },
      { exerciseId: '00000000-0000-4000-8000-000000000008', sets: 4, repetitions: 3, intensity: 65, referenceExerciseId: '00000000-0000-4000-8000-000000000002', restSeconds: 120, notes: 'Mantén la barra cerca del cuerpo' },
      { exerciseId: '00000000-0000-4000-8000-000000000003', sets: 4, repetitions: 4, intensity: 70, referenceExerciseId: '00000000-0000-4000-8000-000000000003', restSeconds: 150, notes: 'Torso vertical y apoyo completo' },
    ],
  },
  intermediate: {
    title: 'Clásicos y fuerza específica',
    description: 'Trabajo de los movimientos de competición con una base sólida de fuerza.',
    dayName: 'Clásicos',
    exercises: [
      { exerciseId: '00000000-0000-4000-8000-000000000001', sets: 5, repetitions: 2, intensity: 75, referenceExerciseId: '00000000-0000-4000-8000-000000000001', restSeconds: 150, notes: 'Repeticiones técnicamente consistentes' },
      { exerciseId: '00000000-0000-4000-8000-000000000002', sets: 4, repetitions: 2, intensity: 75, referenceExerciseId: '00000000-0000-4000-8000-000000000002', restSeconds: 180, notes: 'Controla la cargada antes del jerk' },
      { exerciseId: '00000000-0000-4000-8000-000000000003', sets: 4, repetitions: 3, intensity: 80, referenceExerciseId: '00000000-0000-4000-8000-000000000003', restSeconds: 180, notes: 'Mantén velocidad en cada repetición' },
    ],
  },
  advanced: {
    title: 'Rendimiento específico',
    description: 'Intensidad alta en los movimientos clásicos y fuerza máxima aplicada.',
    dayName: 'Rendimiento',
    exercises: [
      { exerciseId: '00000000-0000-4000-8000-000000000001', sets: 6, repetitions: 2, intensity: 80, referenceExerciseId: '00000000-0000-4000-8000-000000000001', restSeconds: 180, notes: 'Ajusta según la velocidad de la barra' },
      { exerciseId: '00000000-0000-4000-8000-000000000002', sets: 5, repetitions: 2, intensity: 80, referenceExerciseId: '00000000-0000-4000-8000-000000000002', restSeconds: 210, notes: 'Mantén el estándar de competición' },
      { exerciseId: '00000000-0000-4000-8000-000000000005', sets: 5, repetitions: 3, intensity: 80, referenceExerciseId: '00000000-0000-4000-8000-000000000005', restSeconds: 210, notes: 'Reserva una repetición en recámara' },
    ],
  },
};

export const workoutRepository = {
  async ensureOnboarding() {
    const { error } = await client().rpc('ensure_user_onboarding');
    if (error) throw new Error(error.message);
  },

  async loadProfile(userId: string): Promise<UserProfile> {
    const { data, error } = await client()
      .from('profiles')
      .select('user_id,display_name,bio,level,goals,training_days_per_week,height_cm,weight_kg,avatar_base64,onboarding_completed,weightlifting_experience,preferred_language,profile_visibility,show_training_data,show_progress,show_public_routines,confirm_detected_records')
      .eq('user_id', userId)
      .single();
    const profile = requireData(data, error);
    return {
      userId: profile.user_id,
      displayName: profile.display_name,
      bio: profile.bio ?? '',
      level: profile.level,
      goals: profile.goals ?? [],
      trainingDaysPerWeek: profile.training_days_per_week,
      heightCm: profile.height_cm === null ? null : Number(profile.height_cm),
      weightKg: profile.weight_kg === null ? null : Number(profile.weight_kg),
      avatarBase64: profile.avatar_base64,
      onboardingCompleted: profile.onboarding_completed,
      weightliftingExperience: profile.weightlifting_experience,
      preferredLanguage: profile.preferred_language,
      profileVisibility: profile.profile_visibility,
      showTrainingData: profile.show_training_data,
      showProgress: profile.show_progress,
      showPublicRoutines: profile.show_public_routines,
      confirmDetectedRecords: profile.confirm_detected_records,
    };
  },

  async saveProfile(profile: UserProfile): Promise<UserProfile> {
    const { error } = await client()
      .from('profiles')
      .update({
        display_name: profile.displayName.trim(),
        bio: profile.bio.trim() || null,
        level: profile.level,
        goals: profile.goals,
        training_days_per_week: profile.trainingDaysPerWeek,
        height_cm: profile.heightCm,
        weight_kg: profile.weightKg,
        avatar_base64: profile.avatarBase64,
        onboarding_completed: profile.onboardingCompleted,
        weightlifting_experience: profile.weightliftingExperience,
        preferred_language: profile.preferredLanguage,
        profile_visibility: profile.profileVisibility,
        show_training_data: profile.showTrainingData,
        show_progress: profile.showProgress,
        show_public_routines: profile.showPublicRoutines,
        confirm_detected_records: profile.confirmDetectedRecords,
      })
      .eq('user_id', profile.userId);
    if (error) throw new Error(error.message);
    return this.loadProfile(profile.userId);
  },

  async savePreferredLanguage(userId: string, preferredLanguage: UserProfile['preferredLanguage']) {
    const { error } = await client()
      .from('profiles')
      .update({ preferred_language: preferredLanguage })
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  },

  async loadPublicAthleteProfile(userId: string): Promise<PublicAthleteProfile> {
    const [{ data, error }, { data: rankData, error: rankError }] = await Promise.all([
      client().rpc('public_athlete_profile', { target_user_id: userId }),
      client().rpc('public_athlete_rank', { target_user_id: userId }),
    ]);
    if (error) throw new Error(error.message);
    if (rankError) throw new Error(rankError.message);
    const profile = requireData(data as Record<string, unknown> | null, null);
    const rank = (rankData ?? {}) as Record<string, unknown>;
    const rawLiftRecords = Array.isArray(profile.liftRecords) ? profile.liftRecords as Array<Record<string, unknown>> : [];
    const rawRoutines = Array.isArray(profile.routines) ? profile.routines as Array<Record<string, unknown>> : [];
    return {
      userId: String(profile.userId),
      displayName: optionalText(profile.displayName) ?? 'Atleta',
      bio: optionalText(profile.bio) ?? '',
      level: profile.level as PublicAthleteProfile['level'],
      avatarBase64: optionalText(profile.avatarBase64),
      joinedAt: String(profile.joinedAt),
      accountLevel: Number(rank.level ?? 1),
      totalXp: Number(rank.totalXp ?? 0),
      unlockedAchievementCount: Number(rank.unlockedCount ?? 0),
      trainingDataVisible: Boolean(profile.trainingDataVisible),
      progressVisible: Boolean(profile.progressVisible),
      routinesVisible: Boolean(profile.routinesVisible),
      goals: Array.isArray(profile.goals) ? profile.goals.filter((goal): goal is string => typeof goal === 'string') : [],
      trainingDaysPerWeek: profile.trainingDaysPerWeek === null ? null : Number(profile.trainingDaysPerWeek),
      heightCm: profile.heightCm === null ? null : Number(profile.heightCm),
      weightKg: profile.weightKg === null ? null : Number(profile.weightKg),
      weightliftingExperience: optionalText(profile.weightliftingExperience) as PublicAthleteProfile['weightliftingExperience'],
      liftRecords: rawLiftRecords.map((record) => ({
        id: String(record.id),
        lift: record.lift as LiftType,
        weightKg: Number(record.weightKg),
        achievedOn: String(record.achievedOn),
        source: record.source as LiftRecord['source'],
      })),
      routines: rawRoutines.map((routine) => ({
        routineId: String(routine.routineId),
        versionId: String(routine.versionId),
        title: optionalText(routine.title) ?? 'Rutina',
        description: optionalText(routine.description) ?? '',
        level: routine.level as PublicAthleteProfile['level'],
        focus: routine.focus as PublicAthleteProfile['routines'][number]['focus'],
        weeks: Number(routine.weeks),
        daysPerWeek: Number(routine.daysPerWeek),
        publishedAt: String(routine.publishedAt),
        likeCount: Number(routine.likeCount ?? 0),
        questionCount: Number(routine.questionCount ?? 0),
      })),
    };
  },

  async loadNotifications(offset = 0, limit = 10): Promise<PageResult<AppNotification>> {
    const { data, error } = await client().rpc('my_notifications_page', {
      page_limit: limit + 1,
      page_offset: offset,
    });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const items = rows.slice(0, limit).map((notification: Record<string, unknown>) => ({
      id: String(notification.id),
      type: notification.notification_type as AppNotification['type'],
      actorId: optionalText(notification.actor_id),
      actorName: optionalText(notification.actor_name) ?? 'Atleta',
      actorAvatar: optionalText(notification.actor_avatar),
      routineVersionId: optionalText(notification.routine_version_id),
      routineTitle: optionalText(notification.routine_title) ?? 'Rutina',
      questionBody: optionalText(notification.question_body),
      readAt: optionalText(notification.read_at),
      createdAt: String(notification.created_at),
    }));
    return { items, hasMore: rows.length > limit };
  },

  async countUnreadNotifications(): Promise<number> {
    const { count, error } = await client().from('notifications')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null);
    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  async markNotificationsRead(notificationIds?: string[]) {
    const { error } = await client().rpc('mark_notifications_read', {
      target_notification_ids: notificationIds?.length ? notificationIds : null,
    });
    if (error) throw new Error(error.message);
  },

  async loadGamification(): Promise<GamificationProgress> {
    const { data, error } = await client().rpc('my_gamification');
    if (error) throw new Error(error.message);
    const progress = requireData(data as Record<string, unknown> | null, null);
    const achievements = Array.isArray(progress.achievements) ? progress.achievements as Array<Record<string, unknown>> : [];
    const recentEvents = Array.isArray(progress.recentEvents) ? progress.recentEvents as Array<Record<string, unknown>> : [];
    return {
      totalXp: Number(progress.totalXp ?? 0),
      level: Number(progress.level ?? 1),
      currentLevelXp: Number(progress.currentLevelXp ?? 0),
      nextLevelXp: Number(progress.nextLevelXp ?? 250),
      unlockedCount: Number(progress.unlockedCount ?? 0),
      achievements: achievements.map((achievement) => ({
        code: String(achievement.code),
        titleEs: optionalText(achievement.titleEs) ?? '',
        titleEn: optionalText(achievement.titleEn) ?? '',
        descriptionEs: optionalText(achievement.descriptionEs) ?? '',
        descriptionEn: optionalText(achievement.descriptionEn) ?? '',
        icon: optionalText(achievement.icon) ?? 'trophy',
        xpReward: Number(achievement.xpReward ?? 0),
        targetValue: Number(achievement.targetValue ?? 1),
        progressValue: Number(achievement.progressValue ?? 0),
        unlockedAt: optionalText(achievement.unlockedAt),
      })),
      recentEvents: recentEvents.map((event) => ({
        id: String(event.id),
        type: optionalText(event.type) ?? 'experience',
        xp: Number(event.xp ?? 0),
        createdAt: String(event.createdAt),
      })),
    };
  },

  async loadExerciseLibrary(): Promise<ExerciseLibraryItem[]> {
    const { data, error } = await client()
      .from('exercises')
      .select('id,slug,name,equipment,unilateral,metadata')
      .eq('active', true)
      .order('name');
    if (error) throw new Error(error.message);
    const validSections: ExerciseSection[] = ['strength', 'mobility', 'snatch', 'clean_and_jerk'];
    return (data ?? []).flatMap((exercise) => {
      const metadata = exercise.metadata && typeof exercise.metadata === 'object' && !Array.isArray(exercise.metadata)
        ? exercise.metadata as Record<string, unknown>
        : {};
      const section = typeof metadata.section === 'string' && validSections.includes(metadata.section as ExerciseSection)
        ? metadata.section as ExerciseSection
        : null;
      if (!section) return [];
      return [{
        id: exercise.id,
        slug: exercise.slug,
        name: exercise.name,
        section,
        summary: typeof metadata.summary === 'string' ? metadata.summary : '',
        focus: Array.isArray(metadata.focus) ? metadata.focus.filter((item): item is string => typeof item === 'string') : [],
        cues: Array.isArray(metadata.cues) ? metadata.cues.filter((item): item is string => typeof item === 'string') : [],
        equipment: exercise.equipment ?? [],
        unilateral: exercise.unilateral,
        videoUrl: typeof metadata.video_url === 'string' ? metadata.video_url : null,
      }];
    });
  },

  async loadLiftRecords(userId: string): Promise<LiftRecord[]> {
    const { data, error } = await client()
      .from('lift_records')
      .select('id,lift,weight_kg,achieved_on,source')
      .eq('user_id', userId)
      .order('achieved_on', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((record) => ({
      id: record.id,
      lift: record.lift as LiftType,
      weightKg: Number(record.weight_kg),
      achievedOn: record.achieved_on,
      source: record.source as LiftRecord['source'],
    }));
  },

  async saveLiftRecords(userId: string, records: NewLiftRecord[]): Promise<LiftRecord[]> {
    if (records.length === 0) return this.loadLiftRecords(userId);
    const { error } = await client()
      .from('lift_records')
      .upsert(records.map((record) => ({
        user_id: userId,
        lift: record.lift,
        weight_kg: record.weightKg,
        achieved_on: record.achievedOn,
        source: record.source,
      })), { onConflict: 'user_id,lift,achieved_on' });
    if (error) throw new Error(error.message);
    return this.loadLiftRecords(userId);
  },

  async configureInitialRoutine(userId: string, level: UserProfile['level']) {
    const { data: assignment, error: assignmentError } = await client()
      .from('routine_assignments')
      .select('routine_version_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (assignmentError) throw new Error(assignmentError.message);
    if (!assignment) return;

    const { data: day, error: dayError } = await client()
      .from('routine_days')
      .select('id')
      .eq('routine_version_id', assignment.routine_version_id)
      .order('week_number')
      .order('day_index')
      .limit(1)
      .single();
    const routineDay = requireData(day, dayError);
    const setup = initialRoutineByLevel[level];

    const { error: versionError } = await client()
      .from('routine_versions')
      .update({ title: setup.title, description: setup.description, level })
      .eq('id', assignment.routine_version_id);
    if (versionError) throw new Error(versionError.message);

    const { error: dayUpdateError } = await client()
      .from('routine_days')
      .update({ name: setup.dayName, notes: setup.description })
      .eq('id', routineDay.id);
    if (dayUpdateError) throw new Error(dayUpdateError.message);

    const { error: deleteError } = await client()
      .from('prescriptions')
      .delete()
      .eq('routine_day_id', routineDay.id);
    if (deleteError) throw new Error(deleteError.message);

    const { error: insertError } = await client().from('prescriptions').insert(
      setup.exercises.map((exercise, index) => ({
        routine_day_id: routineDay.id,
        exercise_id: exercise.exerciseId,
        sort_order: index + 1,
        sets: exercise.sets,
        repetitions: exercise.repetitions,
        intensity_type: exercise.referenceExerciseId ? 'percentage' : 'load',
        intensity_value: exercise.intensity,
        reference_exercise_id: exercise.referenceExerciseId,
        suggested_load_kg: exercise.referenceExerciseId ? null : exercise.intensity,
        rest_seconds: exercise.restSeconds,
        notes: exercise.notes,
      })),
    );
    if (insertError) throw new Error(insertError.message);
  },

  async loadPlan(userId: string, targetRoutineDayId?: string): Promise<RoutinePlan | null> {
    const { data: assignment, error: assignmentError } = await client()
      .from('routine_assignments')
      .select('id,routine_version_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (assignmentError) throw new Error(assignmentError.message);
    if (!assignment) return null;

    const { data: version, error: versionError } = await client()
      .from('routine_versions')
      .select('id,title,description,weeks,days_per_week')
      .eq('id', assignment.routine_version_id)
      .single();
    const routineVersion = requireData(version, versionError);

    const { data: days, error: dayError } = await client()
      .from('routine_days')
      .select('id,name,week_number,day_index,phase,percentage_adjustment')
      .eq('routine_version_id', routineVersion.id)
      .order('week_number')
      .order('day_index');
    if (dayError) throw new Error(dayError.message);
    if (!days?.length) throw new Error('La rutina no tiene días configurados.');

    const { count: completedSessionCount, error: countError } = await client()
      .from('workout_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('assignment_id', assignment.id)
      .eq('status', 'completed');
    if (countError) throw new Error(countError.message);
    const completedCount = completedSessionCount ?? 0;
    const currentWeek = Math.floor(completedCount / routineVersion.days_per_week) % routineVersion.weeks + 1;
    const targetTemplate = targetRoutineDayId
      ? days.find((day) => day.id === targetRoutineDayId)
      : null;
    if (targetRoutineDayId && !targetTemplate) throw new Error('El día programado no pertenece a la rutina activa.');
    const currentDayIndex = targetTemplate?.day_index
      ?? completedCount % routineVersion.days_per_week + 1;
    const routineDay = days.find((day) => day.week_number === currentWeek && day.day_index === currentDayIndex)
      ?? days.find((day) => day.week_number === 1 && day.day_index === currentDayIndex);
    if (!routineDay) throw new Error('La rutina no tiene configurado este día.');

    const [{ data: prescriptions, error: prescriptionsError }, liftRecords] = await Promise.all([
      client()
        .from('prescriptions')
        .select('id,exercise_id,sort_order,sets,repetitions,intensity_type,intensity_value,suggested_load_kg,notes,exercise:exercises!prescriptions_exercise_id_fkey(id,name),reference_exercise:exercises!prescriptions_reference_exercise_id_fkey(slug,name)')
        .eq('routine_day_id', routineDay.id)
        .order('sort_order'),
      this.loadLiftRecords(userId),
    ]);
    if (prescriptionsError) throw new Error(prescriptionsError.message);

    let orderIndex = 0;
    const latestLifts = latestLiftRecords(liftRecords);
    const exercises: Exercise[] = (prescriptions ?? []).map((item) => {
      const relatedExercise = Array.isArray(item.exercise) ? item.exercise[0] : item.exercise;
      const referenceExercise = Array.isArray(item.reference_exercise)
        ? item.reference_exercise[0]
        : item.reference_exercise;
      const referenceLift = referenceExercise?.slug
        ? referenceLiftFromSlug(referenceExercise.slug)
        : undefined;
      const referenceRecord = referenceLift ? latestLifts.get(referenceLift) : undefined;
      const load = item.intensity_type === 'percentage'
        ? referenceRecord
          ? Math.round((referenceRecord.weightKg * Number(item.intensity_value) / 100) * 2) / 2
          : 0
        : Number(item.suggested_load_kg ?? item.intensity_value ?? 0);
      const sets: TrainingSet[] = Array.from({ length: item.sets }, () => ({
        id: crypto.randomUUID(),
        prescriptionId: item.id,
        exerciseId: item.exercise_id,
        orderIndex: ++orderIndex,
        plannedWeight: load,
        plannedReps: item.repetitions,
        weight: load,
        reps: item.repetitions,
        rpe: null,
        status: 'pending',
      }));
      const intensity = item.intensity_type === 'percentage'
        ? `${Number(item.intensity_value)} %`
        : `${Number(item.intensity_value)} kg`;
      return {
        id: item.exercise_id,
        prescriptionId: item.id,
        name: relatedExercise?.name ?? 'Ejercicio',
        prescription: `${item.sets} × ${item.repetitions} · ${intensity}`,
        context: item.intensity_type === 'percentage'
          ? referenceRecord
            ? `${Number(item.intensity_value)} % de ${referenceExercise?.name ?? 'tu marca'} (${referenceRecord.weightKg} kg) · carga calculada automáticamente`
            : `Añade tu marca de ${referenceExercise?.name ?? 'referencia'} para calcular esta carga`
          : item.notes ?? 'Elige una carga técnica cómoda',
        sets,
      };
    });

    return {
      assignmentId: assignment.id,
      routineVersionId: routineVersion.id,
      routineDayId: routineDay.id,
      title: routineVersion.title,
      description: routineVersion.description ?? '',
      dayName: routineDay.name,
      weekNumber: currentWeek,
      dayIndex: routineDay.day_index,
      weeks: routineVersion.weeks,
      daysPerWeek: routineVersion.days_per_week,
      phase: (routineDay.phase ?? 'accumulation') as RoutinePlan['phase'],
      percentageAdjustment: Number(routineDay.percentage_adjustment ?? 0),
      exercises,
    };
  },

  async loadActive(plan: RoutinePlan): Promise<ActiveWorkout | null> {
    const { data: session, error: sessionError } = await client()
      .from('workout_sessions')
      .select('id,started_at')
      .eq('assignment_id', plan.assignmentId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sessionError) throw new Error(sessionError.message);
    if (!session) return null;

    const { data: rows, error: rowsError } = await client()
      .from('performed_sets')
      .select('id,prescription_id,exercise_id,order_index,planned_load_kg,planned_repetitions,load_kg,repetitions,rpe,result')
      .eq('session_id', session.id)
      .order('order_index');
    if (rowsError) throw new Error(rowsError.message);

    const byPrescription = new Map<string, TrainingSet[]>();
    for (const row of rows ?? []) {
      if (!row.prescription_id) continue;
      const current = byPrescription.get(row.prescription_id) ?? [];
      current.push({
        id: row.id,
        prescriptionId: row.prescription_id,
        exerciseId: row.exercise_id,
        orderIndex: row.order_index,
        plannedWeight: Number(row.planned_load_kg),
        plannedReps: row.planned_repetitions,
        weight: Number(row.load_kg),
        reps: row.repetitions,
        rpe: row.rpe === null ? null : Number(row.rpe),
        status: statusFromResult(row.result),
      });
      byPrescription.set(row.prescription_id, current);
    }

    return {
      sessionId: session.id,
      startedAt: session.started_at,
      elapsed: Math.max(0, Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)),
      exercises: plan.exercises.map((exercise) => ({
        ...exercise,
        sets: byPrescription.get(exercise.prescriptionId) ?? exercise.sets,
      })),
    };
  },

  async startSession(userId: string, plan: RoutinePlan): Promise<ActiveWorkout> {
    const startedAt = new Date().toISOString();
    const { data: session, error: sessionError } = await client()
      .from('workout_sessions')
      .insert({
        user_id: userId,
        assignment_id: plan.assignmentId,
        routine_day_id: plan.routineDayId,
        started_at: startedAt,
        status: 'active',
      })
      .select('id,started_at')
      .single();
    const createdSession = requireData(session, sessionError);

    const rows = plan.exercises.flatMap((exercise) =>
      exercise.sets.map((set) => ({
        id: set.id,
        session_id: createdSession.id,
        exercise_id: set.exerciseId,
        prescription_id: set.prescriptionId,
        order_index: set.orderIndex,
        planned_load_kg: set.plannedWeight,
        planned_repetitions: set.plannedReps,
        load_kg: set.weight,
        repetitions: set.reps,
        rpe: set.rpe,
        result: 'skipped',
      })),
    );
    const { error: setsError } = await client().from('performed_sets').insert(rows);
    if (setsError) {
      await client().from('workout_sessions').delete().eq('id', createdSession.id);
      throw new Error(setsError.message);
    }

    const { error: calendarError } = await client().rpc('link_workout_session_to_calendar', {
      target_session_id: createdSession.id,
      target_routine_day_id: plan.routineDayId,
    });
    if (calendarError) {
      await client().from('workout_sessions').delete().eq('id', createdSession.id);
      throw new Error(calendarError.message);
    }

    return {
      sessionId: createdSession.id,
      startedAt: createdSession.started_at,
      elapsed: 0,
      exercises: plan.exercises,
    };
  },

  async saveSet(set: TrainingSet) {
    const { error } = await client()
      .from('performed_sets')
      .update({
        load_kg: set.weight,
        repetitions: set.reps,
        rpe: set.rpe,
        result: resultFromStatus(set.status),
        performed_at: new Date().toISOString(),
      })
      .eq('id', set.id);
    if (error) throw new Error(error.message);
  },

  async finishSession(sessionId: string, feedback: SessionFeedback): Promise<WorkoutPersonalBest[]> {
    const { data, error } = await client().rpc('finish_workout_session_v2', {
      target_session_id: sessionId,
      target_pain_level: feedback.painLevel,
      target_fatigue_level: feedback.fatigueLevel,
      target_overall_feeling: feedback.overallFeeling,
      target_feedback_notes: feedback.notes.trim() || null,
    });
    if (error) throw new Error(error.message);
    return (data ?? []).map((record: Record<string, unknown>) => ({
      id: String(record.record_id),
      exerciseId: String(record.exercise_id),
      exerciseName: String(record.exercise_name),
      exerciseSlug: String(record.exercise_slug),
      repetitions: Number(record.repetitions) as WorkoutPersonalBest['repetitions'],
      weightKg: Number(record.weight_kg),
      estimated1RmKg: Number(record.estimated_1rm_kg),
      previousWeightKg: record.previous_weight_kg === null
        ? null
        : Number(record.previous_weight_kg),
      achievedOn: String(record.achieved_on),
      status: record.record_status as WorkoutPersonalBest['status'],
      canonicalLift: optionalText(record.canonical_lift) as LiftType | null,
      isVariant: Boolean(record.is_variant),
    }));
  },

  async loadExerciseRecords(userId: string): Promise<ExerciseRecord[]> {
    const { data, error } = await client()
      .from('exercise_records')
      .select('id,exercise_id,repetitions,weight_kg,estimated_1rm_kg,achieved_on,status,exercise:exercises(name,slug)')
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .order('achieved_on', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((record) => {
      const exercise = Array.isArray(record.exercise) ? record.exercise[0] : record.exercise;
      const canonicalLift = exercise?.slug ? referenceLiftFromSlug(exercise.slug) : undefined;
      const isCanonical = ['sentadilla', 'arrancada', 'sentadilla-frontal', 'dos-tiempos'].includes(exercise?.slug ?? '');
      return {
        id: record.id,
        exerciseId: record.exercise_id,
        exerciseName: exercise?.name ?? 'Ejercicio',
        exerciseSlug: exercise?.slug ?? '',
        repetitions: record.repetitions as ExerciseRecord['repetitions'],
        weightKg: Number(record.weight_kg),
        estimated1RmKg: Number(record.estimated_1rm_kg),
        previousWeightKg: null,
        achievedOn: record.achieved_on,
        status: record.status as ExerciseRecord['status'],
        canonicalLift: isCanonical ? canonicalLift ?? null : null,
        isVariant: !isCanonical,
      };
    });
  },

  async resolveExerciseRecord(recordId: string, accepted: boolean) {
    const { error } = await client().rpc('resolve_exercise_record', {
      target_record_id: recordId,
      accept_record: accepted,
    });
    if (error) throw new Error(error.message);
  },

  async loadHistory(userId: string): Promise<CompletedWorkout[]> {
    const { data, error } = await client()
      .from('workout_sessions')
      .select('id,started_at,finished_at,pain_level,fatigue_level,overall_feeling,routine_day:routine_days(name,routine_version:routine_versions(title)),performed_sets(planned_load_kg,planned_repetitions,load_kg,repetitions,rpe,result,exercise:exercises(id,name,slug,category))')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('finished_at', { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);

    return (data ?? []).map((session) => {
      const relatedDay = Array.isArray(session.routine_day) ? session.routine_day[0] : session.routine_day;
      const relatedVersion = Array.isArray(relatedDay?.routine_version)
        ? relatedDay?.routine_version[0]
        : relatedDay?.routine_version;
      const sets = session.performed_sets ?? [];
      const completed = sets.filter((set) => set.result === 'success');
      const plannedVolumeKg = sets.reduce((sum, set) => sum + Number(set.planned_load_kg) * set.planned_repetitions, 0);
      const volumeKg = completed.reduce((sum, set) => sum + Number(set.load_kg) * set.repetitions, 0);
      const rpeValues = completed.flatMap((set) => set.rpe === null ? [] : [Number(set.rpe)]);
      const finishedAt = session.finished_at ?? session.started_at;
      const setSummaries: CompletedWorkout['sets'] = sets.map((set) => {
        const exercise = Array.isArray(set.exercise) ? set.exercise[0] : set.exercise;
        return {
          exerciseId: exercise?.id ?? '',
          exerciseName: exercise?.name ?? 'Ejercicio',
          exerciseSlug: exercise?.slug ?? '',
          category: classifyTrainingCategory(exercise?.category ?? ''),
          referenceLift: exercise?.slug ? referenceLiftFromSlug(exercise.slug) ?? null : null,
          plannedWeight: Number(set.planned_load_kg),
          plannedReps: set.planned_repetitions,
          weight: Number(set.load_kg),
          reps: set.repetitions,
          rpe: set.rpe === null ? null : Number(set.rpe),
          result: set.result as CompletedWorkout['sets'][number]['result'],
        };
      });
      return {
        id: session.id,
        routineName: relatedVersion?.title ?? 'Entrenamiento',
        dayName: relatedDay?.name ?? 'Sesión libre',
        completedAt: finishedAt,
        durationSeconds: Math.max(0, Math.round((new Date(finishedAt).getTime() - new Date(session.started_at).getTime()) / 1000)),
        completedSets: completed.length,
        failedSets: sets.filter((set) => set.result === 'miss').length,
        omittedSets: sets.filter((set) => set.result === 'skipped').length,
        volumeKg,
        plannedVolumeKg,
        performancePercentage: plannedVolumeKg > 0 ? Math.round(volumeKg / plannedVolumeKg * 1000) / 10 : 0,
        averageRpe: rpeValues.length ? Math.round(rpeValues.reduce((sum, value) => sum + value, 0) / rpeValues.length * 10) / 10 : null,
        painLevel: session.pain_level,
        fatigueLevel: session.fatigue_level,
        overallFeeling: session.overall_feeling as CompletedWorkout['overallFeeling'],
        sets: setSummaries,
      };
    });
  },

  async loadCalendarEvents(userId: string, from: string, to: string): Promise<TrainingCalendarEvent[]> {
    const { data, error } = await client()
      .from('training_calendar_events')
      .select('id,scheduled_on,event_type,status,title,notes,routine_day_id,workout_session_id,rescheduled_from,routine_day:routine_days(name,day_index)')
      .eq('user_id', userId)
      .gte('scheduled_on', from)
      .lte('scheduled_on', to)
      .order('scheduled_on')
      .order('created_at');
    if (error) throw new Error(error.message);
    return (data ?? []).map((event) => {
      const routineDay = Array.isArray(event.routine_day) ? event.routine_day[0] : event.routine_day;
      return {
        id: event.id,
        scheduledOn: event.scheduled_on,
        eventType: event.event_type as TrainingCalendarEvent['eventType'],
        status: event.status as TrainingCalendarEvent['status'],
        title: event.title,
        notes: event.notes ?? '',
        routineDayId: event.routine_day_id,
        routineDayName: routineDay?.name ?? null,
        routineDayIndex: routineDay?.day_index ?? null,
        workoutSessionId: event.workout_session_id,
        rescheduledFrom: event.rescheduled_from,
      };
    });
  },

  async loadCalendarRoutineDays(routineVersionId: string): Promise<CalendarRoutineDay[]> {
    const { data, error } = await client()
      .from('routine_days')
      .select('id,name,day_index')
      .eq('routine_version_id', routineVersionId)
      .eq('week_number', 1)
      .order('day_index');
    if (error) throw new Error(error.message);
    return (data ?? []).map((day) => ({ id: day.id, name: day.name, dayIndex: day.day_index }));
  },

  async loadAdherenceOverview(): Promise<AdherenceOverview> {
    const { data, error } = await client().rpc('my_adherence_summary');
    if (error) throw new Error(error.message);
    const summary = requireData(data as Record<string, unknown> | null, null);
    const period = (value: unknown): AdherenceOverview['week'] => {
      const item = (value ?? {}) as Record<string, unknown>;
      return {
        planned: Number(item.planned ?? 0),
        completed: Number(item.completed ?? 0),
        skipped: Number(item.skipped ?? 0),
        pending: Number(item.pending ?? 0),
        percentage: Number(item.percentage ?? 0),
      };
    };
    return {
      week: period(summary.week),
      month: period(summary.month),
      currentStreak: Number(summary.currentStreak ?? 0),
      perfectWeeks: Number(summary.perfectWeeks ?? 0),
    };
  },

  async createCalendarEvent(userId: string, event: NewTrainingCalendarEvent) {
    const { error } = await client().from('training_calendar_events').insert({
      user_id: userId,
      scheduled_on: event.scheduledOn,
      event_type: event.eventType,
      status: event.status,
      title: event.title.trim(),
      notes: event.notes.trim() || null,
      routine_day_id: event.routineDayId,
    });
    if (error) throw new Error(error.message);
  },

  async updateCalendarEventStatus(userId: string, eventId: string, status: CalendarEventStatus) {
    const { error } = await client()
      .from('training_calendar_events')
      .update({ status })
      .eq('id', eventId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  },

  async rescheduleCalendarEvent(userId: string, event: TrainingCalendarEvent, scheduledOn: string, notes: string) {
    const { error } = await client()
      .from('training_calendar_events')
      .update({
        scheduled_on: scheduledOn,
        rescheduled_from: event.rescheduledFrom ?? event.scheduledOn,
        notes: notes.trim() || null,
        status: 'planned',
      })
      .eq('id', event.id)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  },

  async deleteCalendarEvent(userId: string, eventId: string) {
    const { error } = await client()
      .from('training_calendar_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  },

  async loadRoutines(_userId: string): Promise<RoutineSummary[]> {
    const { data, error } = await client().rpc('my_routines');
    if (error) throw new Error(error.message);
    return (data ?? []).map((routine: Record<string, unknown>) => ({
      id: String(routine.routine_id),
      versionId: String(routine.routine_version_id),
      title: String(routine.title),
      description: optionalText(routine.description) ?? '',
      level: routine.routine_level as RoutineSummary['level'],
      focus: routine.focus as RoutineSummary['focus'],
      weeks: Number(routine.weeks),
      daysPerWeek: Number(routine.days_per_week),
      visibility: routine.visibility === 'public' ? 'public' : 'private',
      status: routine.routine_status as RoutineSummary['status'],
      active: Boolean(routine.is_active),
      sourceVersionId: optionalText(routine.source_version_id),
      sourceAuthorId: optionalText(routine.source_author_id),
      sourceAuthorName: optionalText(routine.source_author_name),
      sourceAuthorLevel: routine.source_author_level as RoutineSummary['sourceAuthorLevel'],
      sourceAuthorAvatar: optionalText(routine.source_author_avatar),
      sourceLikeCount: Number(routine.source_like_count ?? 0),
      sourceLikedByMe: Boolean(routine.source_liked_by_me),
      sourceQuestionCount: Number(routine.source_question_count ?? 0),
    }));
  },

  async activateRoutine(routineId: string) {
    const { data, error } = await client().rpc('activate_owned_routine', { target_routine_id: routineId });
    if (error) throw new Error(error.message);
    return data as string;
  },

  async importPublicRoutine(versionId: string, activate = true) {
    const { data, error } = await client().rpc('import_public_routine', {
      target_version_id: versionId,
      activate_after_import: activate,
    });
    if (error) throw new Error(error.message);
    return data as string;
  },

  async loadRoutineForEdit(routineId: string): Promise<RoutineEditorDraft> {
    const { data: versions, error: versionsError } = await client()
      .from('routine_versions')
      .select('id,title,description,level,objective,weeks,days_per_week,visibility,version_number')
      .eq('routine_id', routineId)
      .order('version_number', { ascending: false })
      .limit(1);
    if (versionsError) throw new Error(versionsError.message);
    const version = versions?.[0];
    if (!version) throw new Error('No se encontró la rutina.');

    const { data: days, error: daysError } = await client()
      .from('routine_days')
      .select('id,name,week_number,day_index,phase,percentage_adjustment')
      .eq('routine_version_id', version.id)
      .order('week_number')
      .order('day_index');
    if (daysError) throw new Error(daysError.message);
    if (!days?.length) throw new Error('La rutina no tiene sesiones editables.');

    const { data: prescriptions, error: prescriptionsError } = await client()
      .from('prescriptions')
      .select('routine_day_id,exercise_id,sets,repetitions,intensity_type,intensity_value,rest_seconds,notes,exercise:exercises!prescriptions_exercise_id_fkey(name)')
      .in('routine_day_id', days.map((day) => day.id))
      .order('sort_order');
    if (prescriptionsError) throw new Error(prescriptionsError.message);

    const mappedDays = new Map((days ?? []).map((day) => [day.id, {
      name: day.name,
      exercises: (prescriptions ?? []).filter((item) => item.routine_day_id === day.id).map((item) => {
        const relatedExercise = Array.isArray(item.exercise) ? item.exercise[0] : item.exercise;
        return {
          exerciseId: item.exercise_id,
          exerciseName: relatedExercise?.name ?? 'Ejercicio',
          sets: item.sets,
          repetitions: item.repetitions,
          intensityType: item.intensity_type as 'load' | 'percentage',
          intensityValue: Number(item.intensity_value),
          restSeconds: item.rest_seconds ?? 120,
          notes: item.notes ?? '',
        };
      }),
    }]));
    const firstWeekDays = days.filter((day) => day.week_number === 1).map((day) => mappedDays.get(day.id)!);
    const defaultDeloadWeek = version.weeks >= 3 ? version.weeks : null;
    const generatedWeeks = createTrainingWeeks(firstWeekDays, version.weeks, defaultDeloadWeek, defaultDeloadReduction);
    const weekPlans = generatedWeeks.map((generated) => {
      const savedDays = days.filter((day) => day.week_number === generated.weekNumber);
      if (!savedDays.length) return generated;
      return {
        weekNumber: generated.weekNumber,
        phase: (savedDays[0].phase ?? generated.phase) as typeof generated.phase,
        percentageAdjustment: Number(savedDays[0].percentage_adjustment ?? generated.percentageAdjustment),
        days: savedDays.map((day) => mappedDays.get(day.id)!),
      };
    });
    const deloadPlan = weekPlans.find((week) => week.phase === 'deload');
    return {
      routineId,
      title: version.title,
      description: version.description ?? '',
      level: version.level,
      focus: version.objective,
      weeks: version.weeks,
      daysPerWeek: version.days_per_week,
      visibility: version.visibility === 'public' ? 'public' : 'private',
      deloadWeek: deloadPlan?.weekNumber ?? null,
      deloadReduction: deloadPlan ? Math.abs(deloadPlan.percentageAdjustment) : defaultDeloadReduction,
      weekPlans,
    };
  },

  async loadRoutineVersionDays(versionId: string): Promise<RoutineDayDraft[]> {
    const { data: days, error: daysError } = await client()
      .from('routine_days')
      .select('id,name,day_index')
      .eq('routine_version_id', versionId)
      .eq('week_number', 1)
      .order('week_number')
      .order('day_index');
    if (daysError) throw new Error(daysError.message);
    if (!days?.length) return [];
    const { data, error } = await client()
      .from('prescriptions')
      .select('routine_day_id,exercise_id,sets,repetitions,intensity_type,intensity_value,rest_seconds,notes,exercise:exercises!prescriptions_exercise_id_fkey(name)')
      .in('routine_day_id', days.map((day) => day.id))
      .order('sort_order');
    if (error) throw new Error(error.message);
    return days.map((day) => ({
      name: day.name,
      exercises: (data ?? []).filter((item) => item.routine_day_id === day.id).map((item) => {
        const relatedExercise = Array.isArray(item.exercise) ? item.exercise[0] : item.exercise;
        return {
          exerciseId: item.exercise_id,
          exerciseName: relatedExercise?.name ?? 'Ejercicio',
          sets: item.sets,
          repetitions: item.repetitions,
          intensityType: item.intensity_type as 'load' | 'percentage',
          intensityValue: Number(item.intensity_value),
          restSeconds: item.rest_seconds ?? 120,
          notes: item.notes ?? '',
        };
      }),
    }));
  },

  async saveRoutine(draft: RoutineEditorDraft): Promise<string> {
    const { data, error } = await client().rpc('save_user_routine_days', {
      target_routine_id: draft.routineId,
      routine_title: draft.title,
      routine_description: draft.description,
      routine_level: draft.level,
      routine_focus: draft.focus,
      routine_weeks: draft.weeks,
      routine_days_per_week: draft.daysPerWeek,
      routine_visibility: draft.visibility,
      routine_days_data: draft.weekPlans.map((week) => ({
        week_number: week.weekNumber,
        phase: week.phase,
        percentage_adjustment: week.percentageAdjustment,
        days: week.days.map((day) => ({
          name: day.name,
          exercises: day.exercises.map((exercise) => ({
            exercise_id: exercise.exerciseId,
            sets: exercise.sets,
            repetitions: exercise.repetitions,
            intensity_type: exercise.intensityType,
            intensity_value: exercise.intensityValue,
            rest_seconds: exercise.restSeconds,
            notes: exercise.notes,
          })),
        })),
      })),
    });
    if (error) throw new Error(error.message);
    return data as string;
  },

  async deleteRoutine(routineId: string) {
    const { error } = await client().rpc('delete_user_routine', { target_routine_id: routineId });
    if (error) throw new Error(error.message);
  },

  async loadCommunityRoutines({
    offset = 0,
    limit = 8,
    level = null,
    focus = null,
  }: {
    offset?: number;
    limit?: number;
    level?: CommunityRoutine['authorLevel'] | null;
    focus?: CommunityRoutine['focus'] | null;
  } = {}): Promise<PageResult<CommunityRoutine>> {
    const { data, error } = await client().rpc('community_routines_page', {
      page_limit: limit + 1,
      page_offset: offset,
      filter_level: level,
      filter_focus: focus,
    });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const items = rows.slice(0, limit).map((routine: Record<string, unknown>) => ({
      routineId: String(routine.routine_id),
      versionId: String(routine.routine_version_id),
      title: String(routine.title),
      description: textValue(routine.description),
      level: routine.routine_level as CommunityRoutine['level'],
      focus: routine.focus as CommunityRoutine['focus'],
      weeks: Number(routine.weeks),
      daysPerWeek: Number(routine.days_per_week),
      authorId: String(routine.author_id),
      authorName: String(routine.author_name),
      authorLevel: routine.author_level as CommunityRoutine['authorLevel'],
      authorAvatar: optionalTextValue(routine.author_avatar),
      likeCount: Number(routine.like_count),
      likedByMe: Boolean(routine.liked_by_me),
      questionCount: Number(routine.question_count),
      publishedAt: String(routine.published_at),
    }));
    return { items, hasMore: rows.length > limit };
  },

  async exportMyData(): Promise<Record<string, unknown>> {
    const { data, error } = await client().rpc('export_my_data');
    if (error) throw new Error(error.message);
    return requireData(data as Record<string, unknown> | null, null);
  },

  async deleteMyAccount(confirmationEmail: string): Promise<void> {
    const { error } = await client().rpc('delete_my_account', {
      confirmation_email: confirmationEmail,
    });
    if (error) throw new Error(error.message);
  },

  async toggleRoutineLike(versionId: string, liked: boolean) {
    const { data: authData } = await client().auth.getUser();
    if (!authData.user) throw new Error('Debes iniciar sesión.');
    if (liked) {
      const { error } = await client().from('routine_likes').delete()
        .eq('routine_version_id', versionId).eq('user_id', authData.user.id);
      if (error) throw new Error(error.message);
      return;
    }
    const { error } = await client().from('routine_likes').insert({ routine_version_id: versionId, user_id: authData.user.id });
    if (error) throw new Error(error.message);
  },

  async loadRoutineQuestions(versionId: string): Promise<RoutineQuestion[]> {
    const { data, error } = await client().rpc('routine_questions_for', { target_version_id: versionId });
    if (error) throw new Error(error.message);
    return (data ?? []).map((question: Record<string, unknown>) => ({
      id: String(question.id),
      authorId: String(question.author_id),
      authorName: String(question.author_name),
      body: String(question.body),
      answer: optionalTextValue(question.answer),
      createdAt: String(question.created_at),
      answeredAt: optionalTextValue(question.answered_at),
    }));
  },

  async askRoutineQuestion(versionId: string, body: string) {
    const { data: authData } = await client().auth.getUser();
    if (!authData.user) throw new Error('Debes iniciar sesión.');
    const { error } = await client().from('routine_questions').insert({
      routine_version_id: versionId,
      author_id: authData.user.id,
      body: body.trim(),
    });
    if (error) throw new Error(error.message);
  },

  async answerRoutineQuestion(questionId: string, answer: string) {
    const { error } = await client().rpc('answer_routine_question', {
      target_question_id: questionId,
      question_answer: answer.trim(),
    });
    if (error) throw new Error(error.message);
  },
};
