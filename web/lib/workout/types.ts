export type SetStatus = 'pending' | 'completed' | 'failed';

export type TrainingSet = {
  id: string;
  prescriptionId: string;
  exerciseId: string;
  orderIndex: number;
  weight: number;
  reps: number;
  status: SetStatus;
};

export type Exercise = {
  id: string;
  prescriptionId: string;
  name: string;
  prescription: string;
  context: string;
  sets: TrainingSet[];
};

export type RoutinePlan = {
  assignmentId: string;
  routineVersionId: string;
  routineDayId: string;
  title: string;
  description: string;
  dayName: string;
  weekNumber: number;
  dayIndex: number;
  weeks: number;
  daysPerWeek: number;
  exercises: Exercise[];
};

export type ActiveWorkout = {
  sessionId: string;
  exercises: Exercise[];
  elapsed: number;
  startedAt: string;
};

export type CompletedWorkout = {
  id: string;
  routineName: string;
  dayName: string;
  completedAt: string;
  durationSeconds: number;
  completedSets: number;
  failedSets: number;
  omittedSets: number;
  volumeKg: number;
};

export type LiftType = 'back_squat' | 'snatch' | 'front_squat' | 'clean_and_jerk';

export type LiftRecord = {
  id: string;
  lift: LiftType;
  weightKg: number;
  achievedOn: string;
  source: 'onboarding' | 'manual' | 'workout';
};

export type NewLiftRecord = Omit<LiftRecord, 'id'>;

export type WorkoutPersonalBest = {
  lift: LiftType;
  weightKg: number;
  previousWeightKg: number | null;
  achievedOn: string;
};

export type CalendarEventType = 'workout' | 'rest' | 'competition' | 'free_session';
export type CalendarEventStatus = 'planned' | 'completed' | 'skipped';

export type TrainingCalendarEvent = {
  id: string;
  scheduledOn: string;
  eventType: CalendarEventType;
  status: CalendarEventStatus;
  title: string;
  notes: string;
  routineDayId: string | null;
  routineDayName: string | null;
  routineDayIndex: number | null;
  workoutSessionId: string | null;
  rescheduledFrom: string | null;
};

export type NewTrainingCalendarEvent = Omit<
  TrainingCalendarEvent,
  'id' | 'routineDayName' | 'routineDayIndex' | 'workoutSessionId' | 'rescheduledFrom'
>;

export type CalendarRoutineDay = {
  id: string;
  name: string;
  dayIndex: number;
};

export type AdherencePeriod = {
  planned: number;
  completed: number;
  skipped: number;
  pending: number;
  percentage: number;
};

export type AdherenceOverview = {
  week: AdherencePeriod;
  month: AdherencePeriod;
  currentStreak: number;
  perfectWeeks: number;
};

export type WeightliftingExperience =
  | 'never'
  | 'under_6_months'
  | 'six_to_twenty_four_months'
  | 'over_two_years';

export type AthleteLevel = 'starter' | 'beginner' | 'intermediate' | 'advanced';
export type Language = 'es' | 'en';
export type RoutineFocus = 'mobility' | 'strength' | 'technique' | 'competition';
export type RoutineVisibility = 'private' | 'public';
export type ProfileVisibility = 'private' | 'public';

export type ExerciseSection = 'strength' | 'mobility' | 'snatch' | 'clean_and_jerk';

export type ExerciseLibraryItem = {
  id: string;
  slug: string;
  name: string;
  section: ExerciseSection;
  summary: string;
  focus: string[];
  cues: string[];
  equipment: string[];
  unilateral: boolean;
  videoUrl: string | null;
};

export type UserProfile = {
  userId: string;
  displayName: string;
  bio: string;
  level: AthleteLevel;
  goals: string[];
  trainingDaysPerWeek: number | null;
  heightCm: number | null;
  weightKg: number | null;
  avatarBase64: string | null;
  onboardingCompleted: boolean;
  weightliftingExperience: WeightliftingExperience | null;
  preferredLanguage: Language;
  profileVisibility: ProfileVisibility;
  showTrainingData: boolean;
  showProgress: boolean;
  showPublicRoutines: boolean;
};

export type PublicProfileRoutine = {
  routineId: string;
  versionId: string;
  title: string;
  description: string;
  level: AthleteLevel;
  focus: RoutineFocus;
  weeks: number;
  daysPerWeek: number;
  publishedAt: string;
  likeCount: number;
  questionCount: number;
};

export type PublicAthleteProfile = {
  userId: string;
  displayName: string;
  bio: string;
  level: AthleteLevel;
  avatarBase64: string | null;
  joinedAt: string;
  accountLevel: number;
  totalXp: number;
  unlockedAchievementCount: number;
  trainingDataVisible: boolean;
  progressVisible: boolean;
  routinesVisible: boolean;
  goals: string[];
  trainingDaysPerWeek: number | null;
  heightCm: number | null;
  weightKg: number | null;
  weightliftingExperience: WeightliftingExperience | null;
  liftRecords: LiftRecord[];
  routines: PublicProfileRoutine[];
};

export type AppNotification = {
  id: string;
  type: 'routine_like' | 'routine_question';
  actorId: string | null;
  actorName: string;
  actorAvatar: string | null;
  routineVersionId: string | null;
  routineTitle: string;
  questionBody: string | null;
  readAt: string | null;
  createdAt: string;
};

export type Achievement = {
  code: string;
  titleEs: string;
  titleEn: string;
  descriptionEs: string;
  descriptionEn: string;
  icon: string;
  xpReward: number;
  targetValue: number;
  progressValue: number;
  unlockedAt: string | null;
};

export type ExperienceEvent = {
  id: string;
  type: string;
  xp: number;
  createdAt: string;
};

export type GamificationProgress = {
  totalXp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  unlockedCount: number;
  achievements: Achievement[];
  recentEvents: ExperienceEvent[];
};

export type RoutineSummary = {
  id: string;
  versionId: string;
  title: string;
  description: string;
  level: UserProfile['level'];
  focus: RoutineFocus;
  weeks: number;
  daysPerWeek: number;
  visibility: RoutineVisibility;
  status: 'draft' | 'active' | 'archived';
  active: boolean;
  sourceVersionId: string | null;
  sourceAuthorId: string | null;
  sourceAuthorName: string | null;
  sourceAuthorLevel: AthleteLevel | null;
  sourceAuthorAvatar: string | null;
  sourceLikeCount: number;
  sourceLikedByMe: boolean;
  sourceQuestionCount: number;
};

export type RoutineExerciseDraft = {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  repetitions: number;
  intensityType: 'load' | 'percentage';
  intensityValue: number;
  restSeconds: number;
  notes: string;
};

export type RoutineDayDraft = {
  name: string;
  exercises: RoutineExerciseDraft[];
};

export type RoutineEditorDraft = {
  routineId: string | null;
  title: string;
  description: string;
  level: AthleteLevel;
  focus: RoutineFocus;
  weeks: number;
  daysPerWeek: number;
  visibility: RoutineVisibility;
  days: RoutineDayDraft[];
};

export type CommunityRoutine = {
  routineId: string;
  versionId: string;
  title: string;
  description: string;
  level: AthleteLevel;
  focus: RoutineFocus;
  weeks: number;
  daysPerWeek: number;
  authorId: string;
  authorName: string;
  authorLevel: AthleteLevel;
  authorAvatar: string | null;
  likeCount: number;
  likedByMe: boolean;
  questionCount: number;
  publishedAt: string;
};

export type RoutineQuestion = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  answer: string | null;
  createdAt: string;
  answeredAt: string | null;
};

export function freshExercises(exercises: Exercise[]): Exercise[] {
  let orderIndex = 0;
  return exercises.map((exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => ({
      ...set,
      id: crypto.randomUUID(),
      orderIndex: ++orderIndex,
      status: 'pending',
    })),
  }));
}
