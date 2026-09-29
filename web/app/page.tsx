'use client';

import { lazy, Suspense, type ChangeEvent, type SubmitEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import NextImage from 'next/image';
import {
  ArrowLeft,
  AlertTriangle,
  BarChart3,
  Bot,
  BookOpen,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  CircleUserRound,
  Compass,
  Dumbbell,
  Download,
  Eye,
  Flame,
  Gauge,
  LockKeyhole,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Timer,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { LanguageToggle } from '@/components/language-toggle';
import { NotificationCenter } from '@/components/notification-center';
import { GamificationCelebration, requestGamificationCheck } from '@/components/gamification-celebration';
import { WorkoutFeedbackDialog } from '@/components/workout-feedback-dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { I18nProvider, translateKnownText, useI18n } from '@/lib/i18n';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { determineAthleteLevel, liftDefinitions, latestLiftRecords, todayForInput } from '@/lib/workout/lifts';
import { workoutRepository } from '@/lib/workout/repository';
import { detectPerformanceDrop } from '@/lib/workout/performance';
import {
  freshExercises,
  type CompletedWorkout,
  type Exercise,
  type ExerciseLibraryItem,
  type LiftRecord,
  type LiftType,
  type Language,
  type NewLiftRecord,
  type PerformanceAlert,
  type RoutinePlan,
  type RoutineSummary,
  type SessionFeedback,
  type TrainingSet,
  type UserProfile,
  type WeightliftingExperience,
  type WorkoutPersonalBest,
} from '@/lib/workout/types';

const RoutineHub = lazy(() => import('@/components/routine-hub').then((module) => ({ default: module.RoutineHub })));
const CoachAssistant = lazy(() => import('@/components/coach-assistant').then((module) => ({ default: module.CoachAssistant })));
const ExerciseEncyclopedia = lazy(() => import('@/components/exercise-encyclopedia').then((module) => ({ default: module.ExerciseEncyclopedia })));
const AchievementConsole = lazy(() => import('@/components/achievement-console').then((module) => ({ default: module.AchievementConsole })));
const TrainingCalendar = lazy(() => import('@/components/training-calendar').then((module) => ({ default: module.TrainingCalendar })));
const AdvancedStatistics = lazy(() => import('@/components/advanced-statistics').then((module) => ({ default: module.AdvancedStatistics })));
const LiftProgress = lazy(() => import('@/components/lift-progress').then((module) => ({ default: module.LiftProgress })));
const PerformanceRecords = lazy(() => import('@/components/performance-records').then((module) => ({ default: module.PerformanceRecords })));

type Screen = 'today' | 'session' | 'summary';
type AppView = 'today' | 'calendar' | 'routines' | 'coach' | 'encyclopedia' | 'history' | 'achievements' | 'profile';

const navItems = [
  { id: 'today' as const, label: 'Hoy', labelEn: 'Today', icon: Flame },
  { id: 'calendar' as const, label: 'Calendario', labelEn: 'Calendar', icon: CalendarDays },
  { id: 'routines' as const, label: 'Rutinas', labelEn: 'Routines', icon: BookOpen },
  { id: 'coach' as const, label: 'Entrenador', labelEn: 'Coach', icon: Bot },
  { id: 'encyclopedia' as const, label: 'Ejercicios', labelEn: 'Exercises', icon: Compass },
  { id: 'history' as const, label: 'Progreso', labelEn: 'Progress', icon: BarChart3 },
  { id: 'achievements' as const, label: 'Logros', labelEn: 'Achievements', icon: Trophy },
  { id: 'profile' as const, label: 'Perfil', labelEn: 'Profile', icon: CircleUserRound },
];

const profileGoals = [
  { id: 'technique', label: 'Técnica', labelEn: 'Technique', description: 'Afinar posiciones, recepción y consistencia.', descriptionEn: 'Refine positions, receiving mechanics and consistency.' },
  { id: 'strength', label: 'Fuerza', labelEn: 'Strength', description: 'Desarrollar la base para mover más carga.', descriptionEn: 'Build the foundation to lift heavier loads.' },
  { id: 'mobility', label: 'Movilidad', labelEn: 'Mobility', description: 'Mejorar rangos y control en las posiciones.', descriptionEn: 'Improve range and control in key positions.' },
  { id: 'competition', label: 'Competición', labelEn: 'Competition', description: 'Preparar intentos, estrategia y puesta a punto.', descriptionEn: 'Prepare attempts, strategy and peaking.' },
] as const;

const experienceOptions: Array<{ id: WeightliftingExperience; label: string; labelEn: string; description: string; descriptionEn: string }> = [
  { id: 'never', label: 'Nunca', labelEn: 'Never', description: 'Será mi primer contacto con la halterofilia.', descriptionEn: 'This will be my first contact with weightlifting.' },
  { id: 'under_6_months', label: 'Menos de 6 meses', labelEn: 'Less than 6 months', description: 'Conozco los movimientos, pero sigo aprendiendo las posiciones.', descriptionEn: 'I know the lifts, but I am still learning the positions.' },
  { id: 'six_to_twenty_four_months', label: 'Entre 6 meses y 2 años', labelEn: '6 months to 2 years', description: 'Entreno los movimientos clásicos con regularidad.', descriptionEn: 'I train the competition lifts regularly.' },
  { id: 'over_two_years', label: 'Más de 2 años', labelEn: 'More than 2 years', description: 'Tengo experiencia consolidada y referencias estables.', descriptionEn: 'I have solid experience and stable reference lifts.' },
];

const levelLabels: Record<UserProfile['level'], string> = {
  starter: 'Iniciación',
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

const trainingPhaseLabels = {
  accumulation: ['Acumulación', 'Accumulation'],
  intensification: ['Intensificación', 'Intensification'],
  deload: ['Descarga', 'Deload'],
} as const;

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'H';
}

function ProfilePicture({ profile }: { profile: UserProfile }) {
  return profile.avatarBase64
    ? <NextImage src={profile.avatarBase64} alt="" width={320} height={320} unoptimized />
    : <>{initialsFor(profile.displayName)}</>;
}

function GoalSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (goals: string[]) => void;
}) {
  const { language } = useI18n();
  function toggle(goal: string, checked: boolean) {
    onChange(checked
      ? [...new Set([...selected, goal])]
      : selected.filter((item) => item !== goal));
  }

  return (
    <div className="goal-grid">
      {profileGoals.map((goal) => (
        <div className={selected.includes(goal.id) ? 'goal-option is-selected' : 'goal-option'} key={goal.id}>
          <Checkbox
            id={`goal-${goal.id}`}
            checked={selected.includes(goal.id)}
            onCheckedChange={(checked) => toggle(goal.id, checked)}
            aria-label={language === 'es' ? goal.label : goal.labelEn}
          />
          <label htmlFor={`goal-${goal.id}`}><strong>{language === 'es' ? goal.label : goal.labelEn}</strong><small>{language === 'es' ? goal.description : goal.descriptionEn}</small></label>
        </div>
      ))}
    </div>
  );
}

async function compressAvatar(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Selecciona un archivo de imagen.');
  if (file.size > 5 * 1024 * 1024) throw new Error('La imagen original no puede superar 5 MB.');

  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('No se pudo leer la imagen.'));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('La imagen no es válida.'));
    element.src = source;
  });

  const size = 320;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo procesar la imagen.');
  const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - cropSize) / 2;
  const sourceY = (image.naturalHeight - cropSize) / 2;
  context.fillStyle = '#f3f1eb';
  context.fillRect(0, 0, size, size);
  context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.82);
}

function InitialSetup({
  profile,
  liftRecords,
  onComplete,
}: {
  profile: UserProfile;
  liftRecords: LiftRecord[];
  onComplete: (profile: UserProfile, records: NewLiftRecord[]) => Promise<void>;
}) {
  const { language, tr } = useI18n();
  const [draft, setDraft] = useState(profile);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const currentLifts = latestLiftRecords(liftRecords);
  const [liftValues, setLiftValues] = useState<Record<LiftType, string | null>>({
    back_squat: currentLifts.get('back_squat')?.weightKg.toString() ?? '',
    snatch: currentLifts.get('snatch')?.weightKg.toString() ?? '',
    front_squat: currentLifts.get('front_squat')?.weightKg.toString() ?? '',
    clean_and_jerk: currentLifts.get('clean_and_jerk')?.weightKg.toString() ?? '',
  });

  const validStep = step === 0
    ? draft.trainingDaysPerWeek !== null
    : step === 1
      ? draft.heightCm !== null && draft.heightCm >= 100 && draft.heightCm <= 250
        && draft.weightKg !== null && draft.weightKg >= 30 && draft.weightKg <= 350
      : step === 2
        ? draft.weightliftingExperience !== null
        : step === 3 || draft.goals.length > 0;

  async function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const avatarBase64 = await compressAvatar(file);
      setDraft((current) => ({ ...current, avatarBase64 }));
    } catch (avatarError) {
      setError(avatarError instanceof Error ? avatarError.message : 'No se pudo procesar la imagen.');
    } finally {
      event.target.value = '';
    }
  }

  async function finish() {
    if (!validStep) return;
    setSaving(true);
    setError('');
    try {
      const records = liftDefinitions.flatMap((lift): NewLiftRecord[] => {
        const value = liftValues[lift.id];
        const weightKg = value === null ? 0 : Number(value);
        return weightKg > 0 ? [{ lift: lift.id, weightKg, achievedOn: todayForInput(), source: 'onboarding' }] : [];
      });
      const levelRecords: LiftRecord[] = [
        ...liftRecords,
        ...records.map((record, index) => ({ ...record, id: `setup-${index}` })),
      ];
      const level = determineAthleteLevel(draft.weightKg, draft.weightliftingExperience, levelRecords);
      await onComplete({ ...draft, level, onboardingCompleted: true }, records);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la configuración.');
      setSaving(false);
    }
  }

  return (
    <main className="setup-page">
      <section className="setup-shell">
        <header className="setup-header">
          <Brand />
          <span>{tr('Paso', 'Step')} {step + 1} {tr('de', 'of')} 5</span>
        </header>
        <Progress value={((step + 1) / 5) * 100} aria-label={`Paso ${step + 1} de 5`} />

        <div className="setup-content">
          {step === 0 && <>
            <p className="eyebrow">{tr('Tu ritmo', 'Your schedule')}</p>
            <h1>{tr('¿Cuántos días entrenas a la semana?', 'How many days a week do you train?')}</h1>
            <p>{tr('Usaremos tu disponibilidad para proponerte rutinas que puedas mantener.', 'We will use your availability to suggest routines you can sustain.')}</p>
            <fieldset className="day-selector">
              <legend className="sr-only">{tr('Días de entrenamiento por semana', 'Training days per week')}</legend>
              {Array.from({ length: 7 }, (_, index) => index + 1).map((days) => (
                <button
                  type="button"
                  className={draft.trainingDaysPerWeek === days ? 'is-selected' : ''}
                  aria-pressed={draft.trainingDaysPerWeek === days}
                  onClick={() => setDraft({ ...draft, trainingDaysPerWeek: days })}
                  key={days}
                >
                  <strong>{days}</strong><span>{days === 1 ? tr('día', 'day') : tr('días', 'days')}</span>
                </button>
              ))}
            </fieldset>
          </>}

          {step === 1 && <>
            <p className="eyebrow">{tr('Tu referencia', 'Your baseline')}</p>
            <h1>{tr('Cuéntanos tus medidas actuales', 'Tell us your current measurements')}</h1>
            <p>{tr('Más adelante combinaremos estos datos con tus marcas para estimar tu nivel de forma objetiva.', 'We will combine these with your lift results to estimate your level objectively.')}</p>
            <div className="measurement-grid">
              <label><span>{tr('Altura', 'Height')}</span><div><input required type="number" min={100} max={250} step="0.1" value={draft.heightCm ?? ''} onChange={(event) => setDraft({ ...draft, heightCm: event.target.value ? Number(event.target.value) : null })} /><small>cm</small></div></label>
              <label><span>{tr('Peso', 'Weight')}</span><div><input required type="number" min={30} max={350} step="0.1" value={draft.weightKg ?? ''} onChange={(event) => setDraft({ ...draft, weightKg: event.target.value ? Number(event.target.value) : null })} /><small>kg</small></div></label>
            </div>
          </>}

          {step === 2 && <>
            <p className="eyebrow">{tr('Tu experiencia', 'Your experience')}</p>
            <h1>{tr('¿Has practicado halterofilia antes?', 'Have you practised weightlifting before?')}</h1>
            <p>{tr('La experiencia técnica pesa más que la fuerza general al decidir por dónde empezar.', 'Technical experience matters more than general strength when deciding where to begin.')}</p>
            <div className="experience-grid">
              {experienceOptions.map((option) => (
                <button type="button" className={draft.weightliftingExperience === option.id ? 'is-selected' : ''} aria-pressed={draft.weightliftingExperience === option.id} onClick={() => setDraft({ ...draft, weightliftingExperience: option.id })} key={option.id}>
                  <strong>{language === 'es' ? option.label : option.labelEn}</strong><span>{language === 'es' ? option.description : option.descriptionEn}</span>
                </button>
              ))}
            </div>
          </>}

          {step === 3 && <>
            <p className="eyebrow">{tr('Tus marcas actuales', 'Your current results')}</p>
            <h1>{tr('¿Qué pesos tienes como referencia?', 'Which reference lifts do you know?')}</h1>
            <p>{tr('Son opcionales. Los usaremos para convertir los porcentajes de las rutinas en cargas orientativas.', 'They are optional. We will use them to turn routine percentages into suggested loads.')}</p>
            <div className="reference-lift-grid">
              {liftDefinitions.map((lift) => (
                <label className={liftValues[lift.id] === null ? 'is-unknown' : ''} key={lift.id}>
                  <span>{translateKnownText(language, lift.label)}</span>
                  <div className="reference-lift-control">
                    <div><input type="number" min={1} max={600} step="0.5" value={liftValues[lift.id] ?? ''} onChange={(event) => setLiftValues({ ...liftValues, [lift.id]: event.target.value })} placeholder="0" disabled={liftValues[lift.id] === null} /><small>kg</small></div>
                    <button type="button" aria-pressed={liftValues[lift.id] === null} onClick={() => setLiftValues({ ...liftValues, [lift.id]: liftValues[lift.id] === null ? '' : null })}>{liftValues[lift.id] === null ? tr('Añadir peso', 'Add weight') : tr('Lo desconozco', "I don't know")}</button>
                  </div>
                </label>
              ))}
            </div>
          </>}

          {step === 4 && <>
            <p className="eyebrow">{tr('Personaliza tu plan', 'Personalise your plan')}</p>
            <h1>{tr('¿Qué quieres conseguir?', 'What do you want to achieve?')}</h1>
            <p>{tr('Selecciona uno o varios objetivos. Los utilizaremos para priorizar unas rutinas frente a otras.', 'Select one or more goals. We will use them to prioritise the right routines.')}</p>
            <GoalSelector selected={draft.goals} onChange={(goals) => setDraft({ ...draft, goals })} />
            <div className="avatar-picker">
              <div className="profile-avatar"><ProfilePicture profile={draft} /></div>
              <div><strong>{tr('Imagen de perfil', 'Profile picture')}</strong><span>{tr('Opcional · JPG, PNG o WebP · máximo 5 MB', 'Optional · JPG, PNG or WebP · 5 MB maximum')}</span></div>
              <label className="file-button"><Camera aria-hidden="true" size={17} />{draft.avatarBase64 ? tr('Cambiar imagen', 'Change picture') : tr('Añadir imagen', 'Add picture')}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void chooseAvatar(event)} /></label>
            </div>
          </>}
          {error && <div className="data-alert" role="alert">{error}</div>}
        </div>

        <footer className="setup-actions">
          {step > 0 ? <Button variant="outline" onClick={() => { setError(''); setStep((value) => value - 1); }}>{tr('Atrás', 'Back')}</Button> : <span />}
          {step < 4
            ? <Button disabled={!validStep} onClick={() => { setError(''); setStep((value) => value + 1); }}>{tr('Continuar', 'Continue')}</Button>
            : <Button disabled={!validStep || saving} onClick={() => void finish()}>{saving ? tr('Guardando…', 'Saving…') : tr('Completar configuración', 'Complete setup')}</Button>}
        </footer>
      </section>
      <aside className="setup-aside" aria-hidden="true"><span>01</span><strong>{tr('ENTRENA', 'TRAIN')}<br />{tr('CON INTENCIÓN.', 'WITH INTENT.')}</strong></aside>
    </main>
  );
}

function Brand() {
  return (
    <div className="brand-lockup" aria-label="Haltero">
      <span className="brand-mark" aria-hidden="true">H</span>
      <span>HALTERO</span>
    </div>
  );
}
function MainNavigation({
  activeView,
  onNavigate,
}: {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}) {
  const { language, tr } = useI18n();
  return (
    <nav className="main-nav" aria-label={tr('Navegación principal', 'Main navigation')}>
      {navItems.map(({ id, label, labelEn, icon: Icon }) => {
        const active = id === activeView;
        return (
          <button
            className={active ? 'nav-item is-active' : 'nav-item'}
            key={label}
            type="button"
            aria-current={active ? 'page' : undefined}
            disabled={!id}
            onClick={() => id && onNavigate(id)}
          >
            <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
            <span>{language === 'es' ? label : labelEn}</span>
          </button>
        );
      })}
    </nav>
  );
}
function AppFrame({
  children,
  activeView,
  onNavigate,
  profile,
  sessionMode = false,
}: {
  children: React.ReactNode;
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  profile: UserProfile;
  sessionMode?: boolean;
}) {
  const { language } = useI18n();
  const levelLabel = translateKnownText(language, levelLabels[profile.level]);

  return (
    <div className={sessionMode ? 'app-shell is-session' : 'app-shell'}>
      <a className="skip-link" href="#main-content">{language === 'es' ? 'Saltar al contenido' : 'Skip to content'}</a>
      {!sessionMode && (
        <aside className="desktop-sidebar">
          <Brand />
          <MainNavigation activeView={activeView} onNavigate={onNavigate} />
          <button className="sidebar-foot" type="button" onClick={() => onNavigate('profile')}>
            <div className="avatar"><ProfilePicture profile={profile} /></div>
            <div><strong>{profile.displayName}</strong><span>{levelLabel}</span></div>
          </button>
        </aside>
      )}
      {!sessionMode && <div className="app-notification"><NotificationCenter onOpenRoutines={() => onNavigate('routines')} /></div>}
      <main className="content-shell" id="main-content" tabIndex={-1}><Suspense fallback={<output className="view-loading">{language === 'es' ? 'Cargando sección…' : 'Loading section…'}</output>}>{children}</Suspense></main>
      {!sessionMode && (
        <MainNavigation activeView={activeView} onNavigate={onNavigate} />
      )}
    </div>
  );
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

function PerformanceDropAlert({
  alert,
  tr,
  locale,
}: {
  alert: PerformanceAlert;
  tr: (spanish: string, english: string) => string;
  locale: string;
}) {
  return (
    <section className="performance-drop-alert" role="alert">
      <span><AlertTriangle aria-hidden="true" /></span>
      <div><strong>{tr('El rendimiento lleva tres sesiones bajando', 'Performance has declined for three sessions')}</strong><p>{tr('La carga realizada respecto a la planificada ha descendido', 'Performed load versus planned load has fallen')} {alert.dropPercentagePoints.toLocaleString(locale)} {tr('puntos. Revisa fatiga, dolor y recuperación antes de aumentar cargas.', 'points. Review fatigue, pain and recovery before increasing loads.')}</p></div>
      <div className="performance-drop-values">{alert.recentPercentages.map((value, index) => <span key={`${value}-${index}`}>{value.toLocaleString(locale)}%</span>)}</div>
    </section>
  );
}

function TrainingApp({ user, onPreferredLanguageLoaded }: { user: User; onPreferredLanguageLoaded: (language: Language) => void }) {
  const { language, locale, tr } = useI18n();
  const [view, setView] = useState<AppView>('today');
  const [screen, setScreen] = useState<Screen>('today');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<RoutinePlan | null>(null);
  const [routines, setRoutines] = useState<RoutineSummary[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [history, setHistory] = useState<CompletedWorkout[]>([]);
  const [liftRecords, setLiftRecords] = useState<LiftRecord[]>([]);
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseLibraryItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showFinishPrompt, setShowFinishPrompt] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [finishingSession, setFinishingSession] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [workoutPersonalBests, setWorkoutPersonalBests] = useState<WorkoutPersonalBest[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoadingData(true);
      setDataError('');
      try {
        await workoutRepository.ensureOnboarding();
        const [loadedProfile, loadedPlan, loadedHistory, loadedRoutines, loadedLiftRecords, loadedExercises] = await Promise.all([
          workoutRepository.loadProfile(user.id),
          workoutRepository.loadPlan(user.id),
          workoutRepository.loadHistory(user.id),
          workoutRepository.loadRoutines(user.id),
          workoutRepository.loadLiftRecords(user.id),
          workoutRepository.loadExerciseLibrary(),
        ]);
        if (cancelled) return;
        setProfile(loadedProfile);
        onPreferredLanguageLoaded(loadedProfile.preferredLanguage);
        setPlan(loadedPlan);
        setHistory(loadedHistory);
        setRoutines(loadedRoutines);
        setLiftRecords(loadedLiftRecords);
        setExerciseLibrary(loadedExercises);

        if (loadedPlan) {
          const active = await workoutRepository.loadActive(loadedPlan);
          if (cancelled) return;
          setExercises(active?.exercises ?? loadedPlan.exercises);
          setElapsed(active?.elapsed ?? 0);
          setActiveSessionId(active?.sessionId ?? null);
        }
      } catch (error) {
        if (!cancelled) setDataError(error instanceof Error ? error.message : 'No se pudieron cargar tus datos.');
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    void loadData();
    return () => { cancelled = true; };
  }, [onPreferredLanguageLoaded, user.id]);

  useEffect(() => {
    if (screen !== 'session' || isPaused) return;
    const interval = window.setInterval(
      () => setElapsed((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [isPaused, screen]);

  useEffect(() => {
    const syncLanguage = window.setTimeout(() => {
      setProfile((current) => current && current.preferredLanguage !== language
        ? { ...current, preferredLanguage: language }
        : current);
    }, 0);
    return () => window.clearTimeout(syncLanguage);
  }, [language]);

  const totals = useMemo(() => {
    const sets = exercises.flatMap((exercise) => exercise.sets);
    const completed = sets.filter((set) => set.status === 'completed');
    const failed = sets.filter((set) => set.status === 'failed');
    return {
      all: sets.length,
      completed: completed.length,
      failed: failed.length,
      pending: sets.length - completed.length - failed.length,
      volume: completed.reduce(
        (sum, set) => sum + set.weight * set.reps,
        0,
      ),
      plannedVolume: sets.reduce(
        (sum, set) => sum + set.plannedWeight * set.plannedReps,
        0,
      ),
      averageRpe: completed.some((set) => set.rpe !== null)
        ? completed.reduce((sum, set) => sum + (set.rpe ?? 0), 0) / completed.filter((set) => set.rpe !== null).length
        : null,
    };
  }, [exercises]);

  const performanceAlert = useMemo(() => detectPerformanceDrop(history), [history]);

  const historyTotals = useMemo(
    () => ({
      sessions: history.length,
      volume: history.reduce((sum, item) => sum + item.volumeKg, 0),
      completedSets: history.reduce(
        (sum, item) => sum + item.completedSets,
        0,
      ),
    }),
    [history],
  );

  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  const today = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  function navigate(nextView: AppView) {
    setView(nextView);
    if (screen === 'summary') setScreen('today');
  }

  function updateSet(
    exerciseId: string,
    setId: string,
    patch: Partial<TrainingSet>,
  ) {
    const currentSet = exercises
      .find((exercise) => exercise.id === exerciseId)
      ?.sets.find((set) => set.id === setId);
    if (!currentSet) return;
    const updatedSet: TrainingSet = { ...currentSet, ...patch };

    setExercises((current) => current.map((exercise) => {
      if (exercise.id !== exerciseId) return exercise;
      return {
        ...exercise,
        sets: exercise.sets.map((set) => set.id === setId ? updatedSet : set),
      };
    }));
    if (activeSessionId) {
      void workoutRepository.saveSet(updatedSet).catch((error) => {
        setDataError(error instanceof Error ? error.message : 'No se pudo guardar la serie.');
      });
    }
  }

  async function startSession() {
    if (!plan) return;
    if (activeSessionId) {
      setScreen('session');
      return;
    }

    setDataError('');
    try {
      const active = await workoutRepository.startSession(user.id, { ...plan, exercises });
      setActiveSessionId(active.sessionId);
      setExercises(active.exercises);
      setElapsed(0);
      setScreen('session');
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'No se pudo iniciar la sesión.');
    }
  }

  async function startScheduledWorkout(routineDayId: string) {
    if (activeSessionId) {
      setView('today');
      setScreen('session');
      return;
    }

    setDataError('');
    try {
      const scheduledPlan = await workoutRepository.loadPlan(user.id, routineDayId);
      if (!scheduledPlan) throw new Error(tr('No se pudo preparar el día de rutina seleccionado.', 'The selected routine day could not be prepared.'));
      const scheduledExercises = freshExercises(scheduledPlan.exercises);
      const active = await workoutRepository.startSession(user.id, {
        ...scheduledPlan,
        exercises: scheduledExercises,
      });
      setPlan(scheduledPlan);
      setExercises(active.exercises);
      setActiveSessionId(active.sessionId);
      setElapsed(0);
      setView('today');
      setScreen('session');
    } catch (error) {
      const message = error instanceof Error ? error.message : tr('No se pudo iniciar la sesión programada.', 'The scheduled session could not be started.');
      setDataError(message);
      throw error;
    }
  }

  function requestFinishSession(ignorePending = false) {
    if (totals.pending > 0 && !showFinishPrompt) {
      setShowFinishPrompt(true);
      return;
    }

    if (ignorePending || totals.pending === 0 || showFinishPrompt) {
      setShowFinishPrompt(false);
      setFeedbackOpen(true);
    }
  }

  async function finishSession(feedback: SessionFeedback) {
    if (!activeSessionId) return;
    setFinishingSession(true);
    setDataError('');
    try {
      await Promise.all(
        exercises.flatMap((exercise) => exercise.sets.map((set) => workoutRepository.saveSet(set))),
      );
      const personalBests = await workoutRepository.finishSession(activeSessionId, feedback);
      requestGamificationCheck();
      const [updatedHistory, updatedLiftRecords] = await Promise.all([
        workoutRepository.loadHistory(user.id),
        workoutRepository.loadLiftRecords(user.id),
      ]);
      setHistory(updatedHistory);
      setLiftRecords(updatedLiftRecords);
      setWorkoutPersonalBests(personalBests);
      if (profile) {
        const updatedLevel = determineAthleteLevel(
          profile.weightKg,
          profile.weightliftingExperience,
          updatedLiftRecords,
        );
        if (updatedLevel !== profile.level) {
          setProfile(await workoutRepository.saveProfile({ ...profile, level: updatedLevel }));
        }
      }
      setActiveSessionId(null);
      setShowFinishPrompt(false);
      setFeedbackOpen(false);
      setScreen('summary');
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'No se pudo finalizar la sesión.');
    } finally {
      setFinishingSession(false);
    }
  }

  async function resolveDetectedRecord(recordId: string, accepted: boolean) {
    setDataError('');
    try {
      await workoutRepository.resolveExerciseRecord(recordId, accepted);
      setWorkoutPersonalBests((current) => current.map((record) => record.id === recordId
        ? { ...record, status: accepted ? 'confirmed' : 'rejected' }
        : record));
      if (accepted) {
        const updatedLiftRecords = await workoutRepository.loadLiftRecords(user.id);
        setLiftRecords(updatedLiftRecords);
        if (profile) {
          const updatedLevel = determineAthleteLevel(
            profile.weightKg,
            profile.weightliftingExperience,
            updatedLiftRecords,
          );
          if (updatedLevel !== profile.level) {
            setProfile(await workoutRepository.saveProfile({ ...profile, level: updatedLevel }));
          }
        }
        requestGamificationCheck();
      }
    } catch (error) {
      setDataError(error instanceof Error ? error.message : tr('No se pudo resolver la marca.', 'The record could not be resolved.'));
    }
  }

  async function resetSession(nextView: AppView = 'today') {
    setElapsed(0);
    setIsPaused(false);
    setShowFinishPrompt(false);
    setFeedbackOpen(false);
    setWorkoutPersonalBests([]);
    setScreen('today');
    setView(nextView);
    try {
      const updatedPlan = await workoutRepository.loadPlan(user.id);
      setPlan(updatedPlan);
      setExercises(updatedPlan ? freshExercises(updatedPlan.exercises) : []);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : tr('No se pudo preparar la siguiente sesión.', 'The next session could not be prepared.'));
      setExercises(plan ? freshExercises(plan.exercises) : []);
    }
  }

  async function saveProfile() {
    if (!profile) return;
    if (!profile.trainingDaysPerWeek || !profile.heightCm || !profile.weightKg || !profile.weightliftingExperience || profile.goals.length === 0) {
      setDataError('Completa los días de entrenamiento, altura, peso, experiencia y al menos un objetivo.');
      return;
    }
    setProfileSaving(true);
    setProfileSaved(false);
    setDataError('');
    try {
      const level = determineAthleteLevel(profile.weightKg, profile.weightliftingExperience, liftRecords);
      const savedProfile = await workoutRepository.saveProfile({ ...profile, level });
      if (!activeSessionId) {
        const updatedPlan = await workoutRepository.loadPlan(user.id);
        setPlan(updatedPlan);
        if (updatedPlan) setExercises(updatedPlan.exercises);
      }
      setProfile(savedProfile);
      setProfileSaved(true);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'No se pudo guardar el perfil.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function completeInitialSetup(nextProfile: UserProfile, initialLiftRecords: NewLiftRecord[]) {
    setDataError('');
    const savedLiftRecords = await workoutRepository.saveLiftRecords(user.id, initialLiftRecords);
    const savedProfile = await workoutRepository.saveProfile(nextProfile);
    await workoutRepository.configureInitialRoutine(user.id, savedProfile.level);
    requestGamificationCheck();
    const updatedPlan = await workoutRepository.loadPlan(user.id);
    setLiftRecords(savedLiftRecords);
    setProfile(savedProfile);
    setPlan(updatedPlan);
    if (updatedPlan) setExercises(updatedPlan.exercises);
  }

  async function refreshRoutineData() {
    const [updatedRoutines, updatedPlan] = await Promise.all([
      workoutRepository.loadRoutines(user.id),
      workoutRepository.loadPlan(user.id),
    ]);
    setRoutines(updatedRoutines);
    setPlan(updatedPlan);
    if (!activeSessionId) setExercises(updatedPlan?.exercises ?? []);
    requestGamificationCheck();
  }

  async function chooseProfileAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !profile) return;
    setDataError('');
    setProfileSaved(false);
    try {
      setProfile({ ...profile, avatarBase64: await compressAvatar(file) });
    } catch (avatarError) {
      setDataError(avatarError instanceof Error ? avatarError.message : 'No se pudo procesar la imagen.');
    } finally {
      event.target.value = '';
    }
  }

  async function exportAccountData() {
    setExportingData(true);
    setDataError('');
    try {
      const exported = await workoutRepository.exportMyData();
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `haltero-datos-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : tr('No se pudieron exportar tus datos.', 'Your data could not be exported.'));
    } finally {
      setExportingData(false);
    }
  }

  async function deleteAccount() {
    if (!user.email || deleteConfirmation.trim().toLowerCase() !== user.email.toLowerCase()) return;
    setDeletingAccount(true);
    setDataError('');
    try {
      await workoutRepository.deleteMyAccount(deleteConfirmation);
      setDeleteAccountOpen(false);
      await getSupabaseClient().auth.signOut({ scope: 'local' });
    } catch (error) {
      setDataError(error instanceof Error ? error.message : tr('No se pudo eliminar la cuenta.', 'The account could not be deleted.'));
      setDeleteAccountOpen(false);
    } finally {
      setDeletingAccount(false);
      setDeleteConfirmation('');
    }
  }

  function applyLiftRecords(records: LiftRecord[]) {
    setLiftRecords(records);
    requestGamificationCheck();
    if (!profile || activeSessionId) return;
    void (async () => {
      try {
        const level = determineAthleteLevel(profile.weightKg, profile.weightliftingExperience, records);
        if (level !== profile.level) setProfile(await workoutRepository.saveProfile({ ...profile, level }));
        const updatedPlan = await workoutRepository.loadPlan(user.id);
        setPlan(updatedPlan);
        if (updatedPlan) setExercises(updatedPlan.exercises);
      } catch (error) {
        setDataError(error instanceof Error ? error.message : 'No se pudieron recalcular las cargas.');
      }
    })();
  }

  if (loadingData) {
    return <main className="auth-page"><div className="auth-loading"><Brand /><p>{tr('Cargando tu entrenamiento…', 'Loading your training…')}</p></div></main>;
  }

  if (!profile) {
    return <main className="auth-page"><div className="auth-loading"><Brand /><p>{dataError || tr('No se pudo abrir tu perfil.', 'Your profile could not be opened.')}</p><Button onClick={() => getSupabaseClient().auth.signOut()}>{tr('Cerrar sesión', 'Sign out')}</Button></div></main>;
  }

  if (!profile.onboardingCompleted) {
    return <InitialSetup profile={profile} liftRecords={liftRecords} onComplete={completeInitialSetup} />;
  }

  if (screen === 'session') {
    return (
      <AppFrame activeView={view} onNavigate={navigate} profile={profile} sessionMode>
        <header className="session-bar">
          <Button variant="ghost" size="icon" aria-label={tr('Guardar y salir', 'Save and exit')} onClick={() => setScreen('today')}>
            <ArrowLeft aria-hidden="true" />
          </Button>
          <div className="session-state">
            <strong>{tr('Sesión activa', 'Active session')}</strong>
            <span><i className="save-dot" aria-hidden="true" /> {tr('Guardado en Supabase', 'Saved to Supabase')}</span>
          </div>
          <Button variant="outline" className="timer-button" onClick={() => setIsPaused((value) => !value)} aria-label={isPaused ? 'Reanudar temporizador' : 'Pausar temporizador'}>
            {isPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            <span>{minutes}:{seconds}</span>
          </Button>
        </header>

        <div className="session-layout">
          <aside className="session-overview">
            <p className="eyebrow">{translateKnownText(language, plan?.title ?? '')} · {tr('Semana', 'Week')} {plan?.weekNumber} · {plan ? trainingPhaseLabels[plan.phase][language === 'es' ? 0 : 1] : ''}</p>
            <h1>{tr('Día', 'Day')} {plan?.dayIndex} · {translateKnownText(language, plan?.dayName ?? '')}</h1>
            <p className="muted-copy">{tr('Tus cambios se sincronizan con tu cuenta.', 'Your changes are synced with your account.')}</p>
            <Progress value={totals.all ? ((totals.completed + totals.failed) / totals.all) * 100 : 0} aria-label={`${totals.completed + totals.failed} de ${totals.all} series registradas`} />
            <p className="progress-copy"><strong>{totals.completed + totals.failed}/{totals.all}</strong> {tr('series registradas', 'sets recorded')}</p>
            <div className="session-key">
              <span><i className="key-dot completed" />{tr('Completada', 'Completed')}</span>
              <span><i className="key-dot failed" />{tr('Fallida', 'Failed')}</span>
              <span><i className="key-dot pending" />{tr('Pendiente', 'Pending')}</span>
            </div>
          </aside>

          <section className="exercise-stack" aria-label={tr('Ejercicios de la sesión', 'Session exercises')}>
            {exercises.map((exercise, exerciseIndex) => (
              <article className="exercise-card" key={exercise.id}>
                <header className="exercise-heading">
                  <div className="exercise-number" aria-hidden="true">{(exerciseIndex + 1).toString().padStart(2, '0')}</div>
                   <div><h2>{translateKnownText(language, exercise.name)}</h2><p>{exercise.prescription}</p></div>
                  <Button variant="ghost" size="icon" aria-label={`Más opciones para ${exercise.name}`}>
                    <MoreHorizontal aria-hidden="true" />
                  </Button>
                </header>
                <p className="exercise-context">{exercise.context}</p>
                <table className="set-table" aria-label={`Series de ${exercise.name}`}>
                  <thead><tr className="set-row set-header">
                    <th scope="col">{tr('Serie', 'Set')}</th><th scope="col">{tr('Carga', 'Load')}</th><th scope="col">{tr('Reps', 'Reps')}</th><th scope="col">RPE</th><th scope="col">{tr('Resultado', 'Result')}</th>
                  </tr></thead>
                  <tbody>{exercise.sets.map((set, setIndex) => (
                    <tr className={`set-row is-${set.status}`} key={set.id}>
                      <th scope="row">{setIndex + 1}</th>
                      <td><label>
                        <span className="sr-only">Carga de la serie {setIndex + 1}</span>
                        <input inputMode="decimal" value={set.weight} onChange={(event) => updateSet(exercise.id, set.id, { weight: Number(event.target.value) })} aria-label={`Carga de la serie ${setIndex + 1} en kilogramos`} />
                        <small>kg</small>
                      </label></td>
                      <td><label>
                        <span className="sr-only">Repeticiones de la serie {setIndex + 1}</span>
                        <input inputMode="numeric" value={set.reps} onChange={(event) => updateSet(exercise.id, set.id, { reps: Number(event.target.value) })} aria-label={`Repeticiones de la serie ${setIndex + 1}`} />
                      </label></td>
                      <td><label>
                        <span className="sr-only">RPE de la serie {setIndex + 1}</span>
                        <input className="rpe-input" type="number" inputMode="decimal" min={1} max={10} step={0.5} value={set.rpe ?? ''} onChange={(event) => updateSet(exercise.id, set.id, { rpe: event.target.value ? Number(event.target.value) : null })} placeholder="—" aria-label={`RPE de la serie ${setIndex + 1}`} />
                      </label></td>
                      <td><div className="set-actions">
                        <button type="button" className="set-result complete" aria-label={`Marcar serie ${setIndex + 1} como completada`} aria-pressed={set.status === 'completed'} onClick={() => updateSet(exercise.id, set.id, { status: set.status === 'completed' ? 'pending' : 'completed' })}>
                          <Check aria-hidden="true" /><span>{tr('Hecha', 'Done')}</span>
                        </button>
                        <button type="button" className="set-result fail" aria-label={`Marcar serie ${setIndex + 1} como fallida`} aria-pressed={set.status === 'failed'} onClick={() => updateSet(exercise.id, set.id, { status: set.status === 'failed' ? 'pending' : 'failed' })}>
                          <X aria-hidden="true" /><span>{tr('Fallo', 'Fail')}</span>
                        </button>
                      </div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </article>
            ))}
          </section>
        </div>

        <footer className="session-footer">
          {showFinishPrompt ? (
            <div className="finish-prompt" role="alert">
              <div><strong>{tr('Quedan', 'There are')} {totals.pending} {tr('series pendientes', 'sets pending')}</strong><span>{tr('Se guardarán como omitidas en el resumen.', 'They will be saved as skipped in the summary.')}</span></div>
              <Button variant="outline" onClick={() => setShowFinishPrompt(false)}>{tr('Seguir entrenando', 'Keep training')}</Button>
              <Button onClick={() => requestFinishSession(true)}>{tr('Finalizar igualmente', 'Finish anyway')}</Button>
            </div>
          ) : (
            <><p><strong>{totals.completed}</strong> {tr('completadas', 'completed')} · {totals.failed} {tr('fallidas', 'failed')} · {totals.pending} {tr('pendientes', 'pending')}</p><Button size="lg" onClick={() => requestFinishSession()}>{tr('Finalizar sesión', 'Finish session')}</Button></>
          )}
        </footer>
        <WorkoutFeedbackDialog open={feedbackOpen} saving={finishingSession} onOpenChange={setFeedbackOpen} onSubmit={finishSession} />
      </AppFrame>
    );
  }

  if (view === 'calendar') {
    return (
      <AppFrame activeView={view} onNavigate={navigate} profile={profile}>
        {dataError && <div className="data-alert routine-global-alert" role="alert">{dataError}</div>}
        <TrainingCalendar
          userId={user.id}
          routineVersionId={plan?.routineVersionId ?? null}
          hasActiveSession={Boolean(activeSessionId)}
          onStartWorkout={startScheduledWorkout}
          onError={setDataError}
        />
      </AppFrame>
    );
  }

  if (view === 'routines') {
    return (
      <AppFrame activeView={view} onNavigate={navigate} profile={profile}>
        {dataError && <div className="data-alert routine-global-alert" role="alert">{dataError}</div>}
        <RoutineHub
          userId={user.id}
          profile={profile}
          routines={routines}
          exercises={exerciseLibrary}
          liftRecords={liftRecords}
          onChanged={refreshRoutineData}
          onGoTraining={() => navigate('today')}
          onError={setDataError}
        />
      </AppFrame>
    );
  }

  if (view === 'coach') {
    return (
      <AppFrame activeView={view} onNavigate={navigate} profile={profile}>
        <CoachAssistant
          key={language}
          profile={profile}
          plan={plan}
          history={history}
          liftRecords={liftRecords}
          exerciseLibrary={exerciseLibrary}
          onOpenExercises={() => navigate('encyclopedia')}
        />
      </AppFrame>
    );
  }

  if (view === 'profile') {
    return (
      <AppFrame activeView={view} onNavigate={navigate} profile={profile}>
        <div className="page-wrap profile-page">
          <header className="top-bar">
            <div className="mobile-brand"><Brand /></div>
            <div className="date-block"><span>{tr('Cuenta conectada', 'Connected account')}</span><strong>{user.email}</strong></div>
            <div className="avatar" aria-hidden="true"><ProfilePicture profile={profile} /></div>
          </header>
          {dataError && <div className="data-alert" role="alert">{dataError}</div>}
          <section className="history-heading">
            <div><p className="eyebrow">{tr('Tu cuenta', 'Your account')}</p><h1>{tr('Perfil de atleta', 'Athlete profile')}</h1></div>
          </section>
          <div className="profile-layout">
            <aside className="profile-summary">
              <div className="profile-avatar"><ProfilePicture profile={profile} /></div>
              <h2>{profile.displayName}</h2>
              <p>{user.email}</p>
              <span className={profile.profileVisibility === 'public' ? 'profile-visibility-badge is-public' : 'profile-visibility-badge'}>{profile.profileVisibility === 'public' ? <><Eye aria-hidden="true" />{tr('Perfil público', 'Public profile')}</> : <><LockKeyhole aria-hidden="true" />{tr('Perfil privado', 'Private profile')}</>}</span>
              <label className="file-button profile-photo-button"><Camera aria-hidden="true" size={17} />{tr('Cambiar imagen', 'Change picture')}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void chooseProfileAvatar(event)} /></label>
              <Button variant="outline" onClick={() => getSupabaseClient().auth.signOut()}>{tr('Cerrar sesión', 'Sign out')}</Button>
            </aside>
            <form className="profile-form" onSubmit={(event) => { event.preventDefault(); void saveProfile(); }}>
              <label>
                <span>{tr('Nombre visible', 'Display name')}</span>
                <input required minLength={2} maxLength={60} value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} />
              </label>
              <label>
                <span>{tr('Nivel estimado', 'Estimated level')}</span>
                <input value={translateKnownText(language, levelLabels[profile.level])} disabled />
                <small>{tr('Se calcula con tu experiencia, peso corporal y marcas registradas.', 'Calculated from your experience, body weight and recorded lifts.')}</small>
              </label>
              <label>
                <span>{tr('Días de entrenamiento por semana', 'Training days per week')}</span>
                <input type="number" min={1} max={7} value={profile.trainingDaysPerWeek ?? ''} onChange={(event) => setProfile({ ...profile, trainingDaysPerWeek: event.target.value ? Number(event.target.value) : null })} />
              </label>
              <label>
                <span>{tr('Altura', 'Height')}</span>
                <div className="unit-input"><input required type="number" min={100} max={250} step="0.1" value={profile.heightCm ?? ''} onChange={(event) => setProfile({ ...profile, heightCm: event.target.value ? Number(event.target.value) : null })} /><small>cm</small></div>
              </label>
              <label>
                <span>{tr('Peso actual', 'Current weight')}</span>
                <div className="unit-input"><input required type="number" min={30} max={350} step="0.1" value={profile.weightKg ?? ''} onChange={(event) => setProfile({ ...profile, weightKg: event.target.value ? Number(event.target.value) : null })} /><small>kg</small></div>
              </label>
              <label className="profile-wide">
                <span>{tr('Experiencia en halterofilia', 'Weightlifting experience')}</span>
                <select required value={profile.weightliftingExperience ?? ''} onChange={(event) => setProfile({ ...profile, weightliftingExperience: event.target.value as WeightliftingExperience })}>
                  <option value="" disabled>{tr('Selecciona tu experiencia', 'Select your experience')}</option>
                  {experienceOptions.map((option) => <option value={option.id} key={option.id}>{language === 'es' ? option.label : option.labelEn}</option>)}
                </select>
              </label>
              <label className="profile-wide">
                <span>{tr('Objetivos', 'Goals')} <small>{tr('elige uno o varios', 'choose one or more')}</small></span>
                <GoalSelector selected={profile.goals} onChange={(goals) => setProfile({ ...profile, goals })} />
              </label>
              <label className="profile-wide">
                <span>{tr('Sobre ti', 'About you')}</span>
                <textarea maxLength={500} rows={5} value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} placeholder={tr('Cuéntanos qué estás trabajando ahora.', 'Tell us what you are working on now.')} />
              </label>
              <section className="profile-wide record-settings" aria-labelledby="record-settings-title">
                <label htmlFor="confirm-detected-records" className={profile.confirmDetectedRecords ? 'is-enabled' : ''}>
                  <Checkbox id="confirm-detected-records" checked={profile.confirmDetectedRecords} onCheckedChange={(checked) => setProfile({ ...profile, confirmDetectedRecords: checked })} />
                  <span><strong id="record-settings-title">{tr('Confirmar marcas detectadas', 'Confirm detected records')}</strong><small>{tr('Antes de incorporar un nuevo récord de entrenamiento podrás guardarlo o descartarlo desde el resumen.', 'Before adding a new training record, you can save or discard it from the summary.')}</small></span>
                </label>
              </section>
              <section className="profile-wide privacy-settings" aria-labelledby="privacy-title">
                <header><div><Eye aria-hidden="true" /><span><strong id="privacy-title">{tr('Privacidad del perfil', 'Profile privacy')}</strong><small>{tr('Decide qué pueden consultar otros atletas.', 'Choose what other athletes can see.')}</small></span></div><label><span className="sr-only">{tr('Visibilidad general', 'General visibility')}</span><select value={profile.profileVisibility} onChange={(event) => setProfile({ ...profile, profileVisibility: event.target.value as UserProfile['profileVisibility'] })}><option value="private">{tr('Perfil privado', 'Private profile')}</option><option value="public">{tr('Perfil público', 'Public profile')}</option></select></label></header>
                <div className="privacy-options">
                  <label htmlFor="privacy-training-data" className={profile.showTrainingData ? 'is-enabled' : ''}><Checkbox id="privacy-training-data" checked={profile.showTrainingData} onCheckedChange={(checked) => setProfile({ ...profile, showTrainingData: checked })} /><span><strong>{tr('Datos de entrenamiento', 'Training data')}</strong><small>{tr('Objetivos, frecuencia, altura, peso y experiencia.', 'Goals, frequency, height, weight and experience.')}</small></span></label>
                  <label htmlFor="privacy-progress" className={profile.showProgress ? 'is-enabled' : ''}><Checkbox id="privacy-progress" checked={profile.showProgress} onCheckedChange={(checked) => setProfile({ ...profile, showProgress: checked })} /><span><strong>{tr('Progresión de marcas', 'Lift progression')}</strong><small>{tr('Histórico fechado de sentadillas, arrancada y dos tiempos.', 'Dated history for squats, snatch and clean and jerk.')}</small></span></label>
                  <label htmlFor="privacy-routines" className={profile.showPublicRoutines ? 'is-enabled' : ''}><Checkbox id="privacy-routines" checked={profile.showPublicRoutines} onCheckedChange={(checked) => setProfile({ ...profile, showPublicRoutines: checked })} /><span><strong>{tr('Rutinas públicas', 'Public routines')}</strong><small>{tr('Solo aparecerán las rutinas que hayas publicado.', 'Only routines you have published will appear.')}</small></span></label>
                </div>
                {profile.profileVisibility === 'private' && <p><LockKeyhole aria-hidden="true" />{tr('Estos permisos quedan guardados, pero nadie verá el perfil hasta que lo marques como público.', 'These permissions are saved, but nobody can view the profile until you make it public.')}</p>}
              </section>
              <section className="profile-wide account-data-settings" aria-labelledby="account-data-title">
                <div><strong id="account-data-title">{tr('Tus datos y tu cuenta', 'Your data and account')}</strong><p>{tr('Descarga una copia legible de tus datos o elimina definitivamente la cuenta.', 'Download a readable copy of your data or permanently delete the account.')}</p></div>
                <div><Button type="button" variant="outline" disabled={exportingData} onClick={() => void exportAccountData()}><Download aria-hidden="true" />{exportingData ? tr('Preparando…', 'Preparing…') : tr('Exportar datos', 'Export data')}</Button><Button type="button" variant="outline" className="danger-action" onClick={() => setDeleteAccountOpen(true)}><Trash2 aria-hidden="true" />{tr('Eliminar cuenta', 'Delete account')}</Button></div>
              </section>
              <div className="profile-actions">
                {profileSaved && <output>{tr('Cambios guardados', 'Changes saved')}</output>}
                <Button type="submit" disabled={profileSaving}>{profileSaving ? tr('Guardando…', 'Saving…') : tr('Guardar perfil', 'Save profile')}</Button>
              </div>
            </form>
          </div>
          <AlertDialog open={deleteAccountOpen} onOpenChange={(open) => { setDeleteAccountOpen(open); if (!open) setDeleteConfirmation(''); }}>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>{tr('¿Eliminar tu cuenta definitivamente?', 'Permanently delete your account?')}</AlertDialogTitle><AlertDialogDescription>{tr('Se eliminarán tu perfil, rutinas, sesiones, marcas, calendario, actividad social y logros. Esta acción no se puede deshacer.', 'Your profile, routines, sessions, results, calendar, social activity and achievements will be deleted. This cannot be undone.')}</AlertDialogDescription></AlertDialogHeader>
              <label className="delete-account-confirm"><span>{tr('Escribe tu correo para confirmar', 'Enter your email to confirm')}</span><input type="email" autoComplete="email" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder={user.email ?? ''} /></label>
              <AlertDialogFooter><AlertDialogCancel>{tr('Cancelar', 'Cancel')}</AlertDialogCancel><AlertDialogAction className="danger-confirm" disabled={deletingAccount || !user.email || deleteConfirmation.trim().toLowerCase() !== user.email.toLowerCase()} onClick={() => void deleteAccount()}>{deletingAccount ? tr('Eliminando…', 'Deleting…') : tr('Eliminar definitivamente', 'Delete permanently')}</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </AppFrame>
    );
  }

  if (view === 'encyclopedia') {
    return (
      <AppFrame activeView={view} onNavigate={navigate} profile={profile}>
        <ExerciseEncyclopedia exercises={exerciseLibrary} />
      </AppFrame>
    );
  }

  if (view === 'achievements') {
    return (
      <AppFrame activeView={view} onNavigate={navigate} profile={profile}>
        {dataError && <div className="data-alert routine-global-alert" role="alert">{dataError}</div>}
        <AchievementConsole onError={setDataError} />
      </AppFrame>
    );
  }

  if (view === 'history') {
    return (
      <AppFrame activeView={view} onNavigate={navigate} profile={profile}>
        <div className="page-wrap history-page">
          <header className="top-bar">
            <div className="mobile-brand"><Brand /></div>
            <div className="date-block"><span>{tr('Tu actividad', 'Your activity')}</span><strong>{tr('Últimas 30 sesiones', 'Last 30 sessions')}</strong></div>
            <button className="avatar" type="button" aria-label={tr('Abrir perfil', 'Open profile')} onClick={() => navigate('profile')}><ProfilePicture profile={profile} /></button>
          </header>
          {dataError && <div className="data-alert" role="alert">{dataError}</div>}
          <section className="history-heading">
            <div><p className="eyebrow">{tr('Progreso', 'Progress')}</p><h1>{tr('Historial de sesiones', 'Session history')}</h1></div>
            <Button onClick={() => navigate('today')}>{tr('Ir al entrenamiento', 'Go to training')}</Button>
          </section>
          {performanceAlert.active && <PerformanceDropAlert alert={performanceAlert} tr={tr} locale={locale} />}
          <section className="history-stats" aria-label={tr('Resumen del historial', 'History summary')}>
            <article><span>{tr('Sesiones', 'Sessions')}</span><strong>{historyTotals.sessions}</strong></article>
            <article><span>{tr('Series completadas', 'Completed sets')}</span><strong>{historyTotals.completedSets}</strong></article>
            <article><span>{tr('Volumen acumulado', 'Total volume')}</span><strong>{historyTotals.volume.toLocaleString(locale)} kg</strong></article>
          </section>
          <AdvancedStatistics history={history} records={liftRecords} bodyWeightKg={profile.weightKg} />
          <LiftProgress userId={user.id} records={liftRecords} onRecordsChange={applyLiftRecords} onError={setDataError} />
          <PerformanceRecords userId={user.id} onError={setDataError} />
          <section className="history-list" aria-labelledby="recent-title">
            <div className="section-heading"><div><p className="eyebrow">{tr('Registro', 'Log')}</p><h2 id="recent-title">{tr('Sesiones recientes', 'Recent sessions')}</h2></div></div>
            {history.length === 0 ? (
              <div className="history-empty">
                <Dumbbell aria-hidden="true" />
                <h3>{tr('Todavía no hay sesiones terminadas', 'No completed sessions yet')}</h3>
                <p>{tr('Cuando finalices un entrenamiento aparecerá aquí con su volumen y resultados.', 'Completed training sessions will appear here with their volume and results.')}</p>
                <Button variant="outline" onClick={() => navigate('today')}>{tr('Ver entrenamiento de hoy', "View today's training")}</Button>
              </div>
            ) : (
              history.map((item) => (
                <article className="history-item" key={item.id}>
                  <div className="history-date"><strong>{formatDate(item.completedAt, locale)}</strong><span>{formatDuration(item.durationSeconds)}</span></div>
                  <div><h3>{translateKnownText(language, item.routineName)}</h3><p>{translateKnownText(language, item.dayName)}</p></div>
                  <dl>
                    <div><dt>{tr('Completadas', 'Completed')}</dt><dd>{item.completedSets}</dd></div>
                    <div><dt>{tr('Planificado', 'Planned')}</dt><dd>{item.plannedVolumeKg.toLocaleString(locale)} kg</dd></div>
                    <div><dt>{tr('Realizado', 'Performed')}</dt><dd>{item.volumeKg.toLocaleString(locale)} kg</dd></div>
                    <div><dt>{tr('Rendimiento', 'Performance')}</dt><dd>{item.performancePercentage.toLocaleString(locale)}%</dd></div>
                    <div><dt>RPE</dt><dd>{item.averageRpe?.toLocaleString(locale) ?? '—'}</dd></div>
                    <div><dt>{tr('Fatiga', 'Fatigue')}</dt><dd>{item.fatigueLevel === null ? '—' : `${item.fatigueLevel}/10`}</dd></div>
                  </dl>
                </article>
              ))
            )}
          </section>
        </div>
      </AppFrame>
    );
  }

  if (screen === 'summary') {
    return (
      <AppFrame activeView={view} onNavigate={navigate} profile={profile}>
        <div className="page-wrap summary-page">
          <header className="mobile-brand"><Brand /></header>
          {dataError && <div className="data-alert" role="alert">{dataError}</div>}
          <section className="summary-hero">
            <div className="summary-check"><Check aria-hidden="true" /></div>
            <p className="eyebrow">{tr('Sesión guardada', 'Session saved')}</p><h1>{tr('Entrenamiento registrado', 'Training recorded')}</h1><p>{translateKnownText(language, plan?.title ?? '')} · {tr('Semana', 'Week')} {plan?.weekNumber}, {tr('día', 'day')} {plan?.dayIndex}</p>
          </section>
          {workoutPersonalBests.length > 0 && (
            <section className="personal-best-celebration" aria-live="polite">
              <div className="personal-best-heading">
                <span><Trophy aria-hidden="true" /></span>
                <div>
                  <p className="eyebrow">{tr('Nuevo récord personal', 'New personal best')}</p>
                  <h2>{workoutPersonalBests.length === 1
                    ? tr('Has superado una de tus marcas', 'You beat one of your personal bests')
                    : tr(`Has superado ${workoutPersonalBests.length} marcas`, `You beat ${workoutPersonalBests.length} personal bests`)}</h2>
                </div>
              </div>
              <div className="personal-best-grid">
                {workoutPersonalBests.map((record) => {
                  const improvement = record.previousWeightKg === null
                    ? null
                    : record.weightKg - record.previousWeightKg;
                  return (
                    <article className={`is-${record.status}`} key={record.id}>
                      <span>{translateKnownText(language, record.exerciseName)} · {record.repetitions}RM {record.isVariant ? `· ${tr('variante', 'variation')}` : ''}</span>
                      <strong>{record.weightKg.toLocaleString(locale)} kg</strong>
                      <small>{improvement === null
                        ? tr('Primera marca registrada', 'First recorded result')
                        : `+${improvement.toLocaleString(locale)} kg`}</small>
                      {record.repetitions > 1 && <small>{tr('1RM estimado', 'Estimated 1RM')}: {record.estimated1RmKg.toLocaleString(locale)} kg</small>}
                      {record.status === 'pending' ? <div className="record-confirm-actions"><Button size="sm" variant="outline" onClick={() => void resolveDetectedRecord(record.id, false)}>{tr('Descartar', 'Discard')}</Button><Button size="sm" onClick={() => void resolveDetectedRecord(record.id, true)}>{tr('Guardar', 'Save')}</Button></div> : <small className="record-resolution">{record.status === 'confirmed' ? tr('Marca guardada', 'Record saved') : tr('Marca descartada', 'Record discarded')}</small>}
                    </article>
                  );
                })}
              </div>
            </section>
          )}
          <section className="summary-grid is-performance" aria-label={tr('Resumen de la sesión', 'Session summary')}>
            <article><strong>{totals.completed}</strong><span>{tr('Series completadas', 'Completed sets')}</span></article>
            <article><strong>{totals.failed}</strong><span>{tr('Series fallidas', 'Failed sets')}</span></article>
            <article><strong>{totals.pending}</strong><span>{tr('Series omitidas', 'Skipped sets')}</span></article>
            <article><strong>{totals.plannedVolume.toLocaleString(locale)} kg</strong><span>{tr('Carga planificada', 'Planned load')}</span></article>
            <article><strong>{totals.volume.toLocaleString(locale)} kg</strong><span>{tr('Carga realizada', 'Performed load')}</span></article>
            <article><strong>{totals.plannedVolume > 0 ? `${Math.round(totals.volume / totals.plannedVolume * 1000) / 10}%` : '—'}</strong><span>{tr('Cumplimiento de carga', 'Load completion')}</span></article>
          </section>
          <div className="summary-detail">
            <div><Timer aria-hidden="true" /><span>{tr('Duración', 'Duration')}</span><strong>{minutes}:{seconds}</strong></div>
            <div><Gauge aria-hidden="true" /><span>RPE {tr('medio', 'average')}</span><strong>{totals.averageRpe?.toLocaleString(locale, { maximumFractionDigits: 1 }) ?? '—'}</strong></div>
          </div>
          <p className="formula-note">{tr('El volumen suma carga × repeticiones de cada serie completada. Los intentos fallidos no cuentan.', 'Volume is load × repetitions for every completed set. Failed attempts do not count.')}</p>
          <div className="summary-actions">
            <Button variant="outline" size="lg" onClick={() => void resetSession('history')}>{tr('Ver historial', 'View history')}</Button>
            <Button size="lg" onClick={() => void resetSession('today')}>{tr('Volver a Hoy', 'Back to Today')}</Button>
          </div>
        </div>
      </AppFrame>
    );
  }

  return (
    <AppFrame activeView={view} onNavigate={navigate} profile={profile}>
      <div className="page-wrap today-page">
        <header className="top-bar">
          <div className="mobile-brand"><Brand /></div>
          <div className="date-block"><span>{tr('Hoy', 'Today')}</span><strong className="capitalize">{today}</strong></div>
          <button className="avatar" type="button" aria-label={tr('Abrir perfil', 'Open profile')} onClick={() => navigate('profile')}><ProfilePicture profile={profile} /></button>
        </header>
        {dataError && <div className="data-alert" role="alert">{dataError}</div>}
        {performanceAlert.active && <PerformanceDropAlert alert={performanceAlert} tr={tr} locale={locale} />}
        <section className="today-heading">
          <div><p className="eyebrow">{tr('Tu entrenamiento', 'Your training')}</p><h1>{tr('Hoy toca construir la base.', 'Today we build the foundation.')}</h1></div>
          {plan && <span className="week-badge">{tr('SEM', 'WK')} {plan.weekNumber.toString().padStart(2, '0')} · {tr('DÍA', 'DAY')} {plan.dayIndex.toString().padStart(2, '0')}</span>}
        </section>
        {plan ? <section className="workout-card">
          <div className="workout-main">
            <div className="workout-labels"><span>{translateKnownText(language, plan.title)}</span><span>{translateKnownText(language, plan.dayName)}</span><span>{trainingPhaseLabels[plan.phase][language === 'es' ? 0 : 1]} {plan.percentageAdjustment !== 0 ? `(${plan.percentageAdjustment > 0 ? '+' : ''}${plan.percentageAdjustment} p.p.)` : ''}</span></div>
            <h2>{translateKnownText(language, plan.description)}</h2>
            <p>{totals.all} {tr('series', 'sets')} · {plan.daysPerWeek} {tr('días por semana', 'days per week')}</p>
            <Button size="lg" className="start-button" onClick={() => void startSession()}>
              {activeSessionId ? tr('Reanudar sesión', 'Resume session') : tr('Iniciar sesión', 'Start session')}
              <Play aria-hidden="true" fill="currentColor" />
            </Button>
          </div>
          <div className="workout-index" aria-hidden="true">{plan.dayIndex.toString().padStart(2, '0')}</div>
        </section> : <div className="history-empty"><Dumbbell aria-hidden="true" /><h3>{tr('No tienes una rutina activa', 'You have no active routine')}</h3><p>{tr('Cuando se asigne una rutina aparecerá aquí.', 'An assigned routine will appear here.')}</p></div>}
        <section className="day-plan" aria-labelledby="plan-title">
          <div className="section-heading"><div><p className="eyebrow">{tr('Día', 'Day')} {plan?.dayIndex ?? 1} · {translateKnownText(language, plan?.dayName ?? 'Sin asignar')}</p><h2 id="plan-title">{tr('Plan de hoy', "Today's plan")}</h2></div><span>{totals.all} {tr('series', 'sets')}</span></div>
          <div className="plan-list">
            {exercises.map((exercise, index) => (
              <article key={exercise.id}>
                <span className="plan-number">{(index + 1).toString().padStart(2, '0')}</span>
                <div><h3>{translateKnownText(language, exercise.name)}</h3><p>{exercise.context.split(' · ')[0]}</p></div>
                <strong>{exercise.prescription}</strong><ChevronRight aria-hidden="true" />
              </article>
            ))}
          </div>
        </section>
        <aside className="week-note">
          <div className="note-icon"><RotateCcw aria-hidden="true" /></div>
          <div><p className="eyebrow">{tr('En el ciclo', 'In this cycle')}</p><h2>{history.length + 1}{language === 'es' ? '.ª sesión registrada' : ' sessions recorded'}</h2><p>{tr('Las cargas se guardan junto a cada intento.', 'Loads are saved with every attempt.')}</p></div>
          <div className="week-progress" aria-label={`Semana ${plan?.weekNumber ?? 1} de ${plan?.weeks ?? 1}`}>
            {Array.from({ length: plan?.weeks ?? 1 }, (_, index) => index + 1).map((week) => <span className={week === plan?.weekNumber ? 'is-active' : ''} key={week}>{week.toString().padStart(2, '0')}</span>)}
          </div>
        </aside>
      </div>
    </AppFrame>
  );
}

function AuthScreen() {
  const { tr } = useI18n();
  const [mode, setMode] = useState<'login' | 'signup' | 'recovery'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const supabase = getSupabaseClient();

    if (mode === 'recovery') {
      const result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      setPending(false);
      setMessage(result.error
        ? result.error.message
        : tr('Si existe una cuenta con ese correo, recibirás un enlace para crear una nueva contraseña.', 'If an account exists for that email, you will receive a link to create a new password.'));
      return;
    }

    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName.trim() } },
        });

    setPending(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (mode === 'signup' && !result.data.session) {
      setMessage(tr('Cuenta creada. Revisa tu correo para confirmarla antes de entrar.', 'Account created. Check your email to confirm it before signing in.'));
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="auth-title">
        <Brand />
        <div className="auth-copy">
          <p className="eyebrow">{tr('Tu entrenamiento, siempre contigo', 'Your training, always with you')}</p>
          <h1 id="auth-title">{mode === 'login' ? tr('Entrar en Haltero', 'Sign in to Haltero') : mode === 'signup' ? tr('Crear una cuenta', 'Create an account') : tr('Recuperar contraseña', 'Reset password')}</h1>
          <p>{mode === 'recovery' ? tr('Te enviaremos un enlace seguro para elegir una contraseña nueva.', 'We will send you a secure link to choose a new password.') : tr('Guarda tus rutinas, sesiones y progreso de forma segura.', 'Keep your routines, sessions and progress safe.')}</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
            <label>
              <span>{tr('Nombre', 'Name')}</span>
              <input required minLength={2} maxLength={60} autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </label>
          )}
          <label>
            <span>{tr('Correo electrónico', 'Email')}</span>
            <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          {mode !== 'recovery' && <label>
            <span>{tr('Contraseña', 'Password')}</span>
            <input required type="password" minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>}
          {message && <output className="auth-message">{message}</output>}
          <Button size="lg" type="submit" disabled={pending}>
            {pending ? tr('Procesando…', 'Processing…') : mode === 'login' ? tr('Entrar', 'Sign in') : mode === 'signup' ? tr('Crear cuenta', 'Create account') : tr('Enviar enlace', 'Send link')}
          </Button>
        </form>
        <div className="auth-links">
          <button className="auth-switch" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }}>{mode === 'login' ? tr('¿Primera vez? Crear una cuenta', 'New here? Create an account') : tr('Volver a iniciar sesión', 'Back to sign in')}</button>
          {mode === 'login' && <button className="auth-switch" type="button" onClick={() => { setMode('recovery'); setMessage(''); }}>{tr('He olvidado mi contraseña', 'I forgot my password')}</button>}
        </div>
      </section>
      <aside className="auth-visual" aria-hidden="true">
        <span>01</span>
        <strong>{tr('ENTRENA', 'TRAIN')}<br />{tr('REGISTRA', 'TRACK')}<br />{tr('PROGRESA', 'PROGRESS')}</strong>
      </aside>
    </main>
  );
}

function PasswordRecoveryScreen({ onComplete }: { onComplete: () => void }) {
  const { tr } = useI18n();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function updatePassword(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) {
      setMessage(tr('Las contraseñas no coinciden.', 'Passwords do not match.'));
      return;
    }
    setPending(true);
    const { error } = await getSupabaseClient().auth.updateUser({ password });
    setPending(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    window.history.replaceState({}, '', window.location.pathname);
    onComplete();
  }

  return <main className="auth-page"><section className="auth-panel" aria-labelledby="recovery-title"><Brand /><div className="auth-copy"><p className="eyebrow">{tr('Cuenta segura', 'Secure account')}</p><h1 id="recovery-title">{tr('Crea una contraseña nueva', 'Create a new password')}</h1><p>{tr('Utiliza al menos ocho caracteres y no reutilices una contraseña de otro servicio.', 'Use at least eight characters and do not reuse a password from another service.')}</p></div><form className="auth-form" onSubmit={updatePassword}><label><span>{tr('Nueva contraseña', 'New password')}</span><input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label><span>{tr('Repetir contraseña', 'Confirm password')}</span><input required type="password" minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>{message && <output className="auth-message">{message}</output>}<Button size="lg" type="submit" disabled={pending || password.length < 8 || password !== confirmation}>{pending ? tr('Guardando…', 'Saving…') : tr('Guardar contraseña', 'Save password')}</Button></form></section></main>;
}

export default function Home() {
  const [language, setLanguage] = useState<Language>('es');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('haltero-language');
    const initial: Language = saved === 'en' || saved === 'es'
      ? saved
      : navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es';
    const syncLanguage = window.setTimeout(() => setLanguage(initial), 0);
    document.documentElement.lang = initial;
    return () => window.clearTimeout(syncLanguage);
  }, []);

  const applyLanguage = useCallback((next: Language) => {
    setLanguage(next);
    window.localStorage.setItem('haltero-language', next);
    document.documentElement.lang = next;
  }, []);

  const changeLanguage = useCallback((next: Language) => {
    applyLanguage(next);
    if (user) void workoutRepository.savePreferredLanguage(user.id, next).catch(() => undefined);
  }, [applyLanguage, user]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    const supabase = getSupabaseClient();
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    }, () => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <I18nProvider language={language}>
      <LanguageToggle onChange={changeLanguage} />
      {loading ? (
        <main className="auth-page"><div className="auth-loading"><Brand /><p>{language === 'es' ? 'Abriendo tu espacio de entrenamiento…' : 'Opening your training space…'}</p></div></main>
      ) : !isSupabaseConfigured ? (
        <main className="auth-page"><div className="auth-loading"><Brand /><p>{language === 'es' ? 'Falta configurar la conexión con Supabase.' : 'The Supabase connection is not configured.'}</p></div></main>
      ) : passwordRecovery && user ? (
        <PasswordRecoveryScreen onComplete={() => setPasswordRecovery(false)} />
      ) : !user ? (
        <AuthScreen />
      ) : (
        <>
          <GamificationCelebration userId={user.id} />
          <TrainingApp user={user} onPreferredLanguageLoaded={applyLanguage} />
        </>
      )}
    </I18nProvider>
  );
}

