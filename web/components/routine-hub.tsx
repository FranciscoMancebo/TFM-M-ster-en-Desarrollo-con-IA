'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, Download, Dumbbell, Globe2, Heart, Lock, MessageCircle, Pencil, Play, Plus, Send, SlidersHorizontal, Sparkles, Trash2, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicAthleteProfileDialog } from '@/components/public-athlete-profile';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { translateKnownText, useI18n } from '@/lib/i18n';
import { workoutRepository } from '@/lib/workout/repository';
import { liftDefinitions } from '@/lib/workout/lifts';
import { generateRoutineDraft, type RoutineGenerationSummary } from '@/lib/workout/routine-generator';
import type {
  AthleteLevel, CommunityRoutine, ExerciseLibraryItem, LiftRecord, RoutineEditorDraft,
  RoutineFocus, RoutineQuestion, RoutineSummary, UserProfile,
  RoutineDayDraft, PublicAthleteProfile,
} from '@/lib/workout/types';

const levels: AthleteLevel[] = ['starter', 'beginner', 'intermediate', 'advanced'];
const focuses: RoutineFocus[] = ['mobility', 'strength', 'technique', 'competition'];

const levelNames: Record<AthleteLevel, [string, string]> = {
  starter: ['Iniciación', 'Starter'],
  beginner: ['Principiante', 'Beginner'],
  intermediate: ['Intermedio', 'Intermediate'],
  advanced: ['Avanzado', 'Advanced'],
};

const focusNames: Record<RoutineFocus, [string, string]> = {
  mobility: ['Movilidad', 'Mobility'],
  strength: ['Fuerza', 'Strength'],
  technique: ['Técnica', 'Technique'],
  competition: ['Competición', 'Competition'],
};

function personInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function emptyDraft(profile: UserProfile, exercises: ExerciseLibraryItem[], language: 'es' | 'en'): RoutineEditorDraft {
  const firstExercise = exercises[0];
  const preferredFocus = profile.goals.find((goal): goal is RoutineFocus => focuses.includes(goal as RoutineFocus)) ?? 'technique';
  const daysPerWeek = profile.trainingDaysPerWeek ?? 3;
  const initialExercise = () => firstExercise ? [{
    exerciseId: firstExercise.id,
    exerciseName: firstExercise.name,
    sets: 4,
    repetitions: 3,
    intensityType: 'load' as const,
    intensityValue: 0,
    restSeconds: 120,
    notes: '',
  }] : [];
  return {
    routineId: null,
    title: '',
    description: '',
    level: profile.level,
    focus: preferredFocus,
    weeks: 4,
    daysPerWeek,
    visibility: 'private',
    days: Array.from({ length: daysPerWeek }, (_, index) => ({
      name: `${language === 'es' ? 'Día' : 'Day'} ${index + 1}`,
      exercises: initialExercise(),
    })),
  };
}

export function RoutineHub({
  userId,
  profile,
  routines,
  exercises,
  liftRecords,
  onChanged,
  onGoTraining,
  onError,
}: {
  userId: string;
  profile: UserProfile;
  routines: RoutineSummary[];
  exercises: ExerciseLibraryItem[];
  liftRecords: LiftRecord[];
  onChanged: () => Promise<void>;
  onGoTraining: () => void;
  onError: (message: string) => void;
}) {
  const { language, locale, tr } = useI18n();
  const [tab, setTab] = useState<'mine' | 'community'>('mine');
  const [community, setCommunity] = useState<CommunityRoutine[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [levelFilter, setLevelFilter] = useState<'all' | AthleteLevel>('all');
  const [focusFilter, setFocusFilter] = useState<'all' | RoutineFocus>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<'manual' | 'assistant' | null>(null);
  const [draft, setDraft] = useState<RoutineEditorDraft>(() => emptyDraft(profile, exercises, language));
  const [generationSummary, setGenerationSummary] = useState<RoutineGenerationSummary | null>(null);
  const [activeEditorDay, setActiveEditorDay] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editingLoading, setEditingLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoutineSummary | null>(null);
  const [questionsFor, setQuestionsFor] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Record<string, RoutineQuestion[]>>({});
  const [planFor, setPlanFor] = useState<string | null>(null);
  const [communityPlans, setCommunityPlans] = useState<Record<string, RoutineDayDraft[]>>({});
  const [questionText, setQuestionText] = useState('');
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [socialSaving, setSocialSaving] = useState(false);
  const [routineActionId, setRoutineActionId] = useState<string | null>(null);
  const [publicProfileOpen, setPublicProfileOpen] = useState(false);
  const [publicProfileLoading, setPublicProfileLoading] = useState(false);
  const [publicProfile, setPublicProfile] = useState<PublicAthleteProfile | null>(null);

  async function refreshCommunity() {
    setLoadingCommunity(true);
    try {
      setCommunity(await workoutRepository.loadCommunityRoutines());
    } catch (error) {
      onError(error instanceof Error ? error.message : tr('No se pudo cargar la comunidad.', 'The community could not be loaded.'));
    } finally {
      setLoadingCommunity(false);
    }
  }

  useEffect(() => {
    if (tab === 'community' && community.length === 0) void refreshCommunity();
  }, [tab]);

  const visibleCommunity = useMemo(() => community.filter((routine) => (
    (levelFilter === 'all' || routine.authorLevel === levelFilter)
    && (focusFilter === 'all' || routine.focus === focusFilter)
  )), [community, focusFilter, levelFilter]);

  function openCreate() {
    setDraft(emptyDraft(profile, exercises, language));
    setCreationMode(null);
    setGenerationSummary(null);
    setActiveEditorDay(0);
    setEditorOpen(true);
  }

  function chooseManualMode() {
    setDraft(emptyDraft(profile, exercises, language));
    setCreationMode('manual');
    setGenerationSummary(null);
    setActiveEditorDay(0);
  }

  function generateAssistedRoutine(settings?: Pick<RoutineEditorDraft, 'focus' | 'weeks' | 'daysPerWeek'>) {
    const preferredFocus = profile.goals.find((goal): goal is RoutineFocus => focuses.includes(goal as RoutineFocus)) ?? 'technique';
    const generated = generateRoutineDraft({
      profile,
      exercises,
      liftRecords,
      focus: settings?.focus ?? preferredFocus,
      weeks: settings?.weeks ?? 4,
      daysPerWeek: settings?.daysPerWeek ?? profile.trainingDaysPerWeek ?? 3,
      language,
    });
    setDraft(generated.draft);
    setGenerationSummary(generated.summary);
    setCreationMode('assistant');
    setActiveEditorDay(0);
  }

  async function openEdit(routine: RoutineSummary) {
    setEditingLoading(true);
    onError('');
    try {
      setDraft(await workoutRepository.loadRoutineForEdit(routine.id));
      setCreationMode('manual');
      setGenerationSummary(null);
      setActiveEditorDay(0);
      setEditorOpen(true);
    } catch (error) {
      onError(error instanceof Error ? error.message : tr('No se pudo abrir la rutina.', 'The routine could not be opened.'));
    } finally {
      setEditingLoading(false);
    }
  }

  function updateExercise(dayIndex: number, index: number, patch: Partial<RoutineDayDraft['exercises'][number]>) {
    setDraft((current) => ({
      ...current,
      days: current.days.map((day, currentDayIndex) => currentDayIndex === dayIndex ? {
        ...day,
        exercises: day.exercises.map((exercise, exerciseIndex) => exerciseIndex === index ? { ...exercise, ...patch } : exercise),
      } : day),
    }));
  }

  function addExercise(dayIndex: number) {
    const firstExercise = exercises[0];
    if (!firstExercise) return;
    setDraft((current) => ({
      ...current,
      days: current.days.map((day, currentDayIndex) => currentDayIndex === dayIndex ? {
        ...day,
        exercises: [...day.exercises, {
          exerciseId: firstExercise.id,
          exerciseName: firstExercise.name,
          sets: 3,
          repetitions: 3,
          intensityType: 'load',
          intensityValue: 0,
          restSeconds: 120,
          notes: '',
        }],
      } : day),
    }));
  }

  function resizeDays(nextCount: number) {
    const safeCount = Math.max(1, Math.min(7, nextCount));
    setDraft((current) => {
      const days = current.days.slice(0, safeCount);
      while (days.length < safeCount) days.push({ name: `${language === 'es' ? 'Día' : 'Day'} ${days.length + 1}`, exercises: [] });
      return { ...current, daysPerWeek: safeCount, days };
    });
    setActiveEditorDay((current) => Math.min(current, safeCount - 1));
  }

  function addDay() {
    if (draft.days.length >= 7) return;
    const nextIndex = draft.days.length;
    setDraft((current) => ({
      ...current,
      daysPerWeek: current.days.length + 1,
      days: [...current.days, { name: `${language === 'es' ? 'Día' : 'Day'} ${current.days.length + 1}`, exercises: [] }],
    }));
    setActiveEditorDay(nextIndex);
  }

  function removeDay(dayIndex: number) {
    if (draft.days.length <= 1) return;
    setDraft((current) => {
      const days = current.days.filter((_, index) => index !== dayIndex);
      return { ...current, daysPerWeek: days.length, days };
    });
    setActiveEditorDay((current) => Math.max(0, Math.min(current, draft.days.length - 2)));
  }

  async function saveRoutine() {
    if (!draft.title.trim() || draft.days.length === 0 || draft.days.some((day) => !day.name.trim() || day.exercises.length === 0)) {
      onError(tr('Añade un título, un nombre y al menos un ejercicio en cada día.', 'Add a title, a name and at least one exercise to every day.'));
      return;
    }
    setSaving(true);
    onError('');
    try {
      await workoutRepository.saveRoutine(draft);
      setEditorOpen(false);
      await onChanged();
      if (draft.visibility === 'public') await refreshCommunity();
    } catch (error) {
      onError(error instanceof Error ? error.message : tr('No se pudo guardar la rutina.', 'The routine could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteRoutine() {
    if (!deleteTarget) return;
    setSocialSaving(true);
    onError('');
    try {
      await workoutRepository.deleteRoutine(deleteTarget.id);
      setDeleteTarget(null);
      await onChanged();
      await refreshCommunity();
    } catch (error) {
      onError(error instanceof Error ? error.message : tr('No se pudo eliminar la rutina.', 'The routine could not be deleted.'));
    } finally {
      setSocialSaving(false);
    }
  }

  async function toggleLike(versionId: string, liked: boolean) {
    setSocialSaving(true);
    try {
      await workoutRepository.toggleRoutineLike(versionId, liked);
      await Promise.all([refreshCommunity(), onChanged()]);
    } catch (error) {
      onError(error instanceof Error ? error.message : tr('No se pudo actualizar el like.', 'The like could not be updated.'));
    } finally {
      setSocialSaving(false);
    }
  }

  async function activateRoutine(routineId: string) {
    setRoutineActionId(routineId);
    onError('');
    try {
      await workoutRepository.activateRoutine(routineId);
      await onChanged();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      onError(message.includes('Finish or abandon the active workout')
        ? tr('Termina o abandona el entrenamiento en curso antes de cambiar de rutina.', 'Finish or abandon the current workout before changing routines.')
        : message || tr('No se pudo activar la rutina.', 'The routine could not be activated.'));
    } finally {
      setRoutineActionId(null);
    }
  }

  async function importAndActivateRoutine(versionId: string) {
    setRoutineActionId(versionId);
    onError('');
    try {
      await workoutRepository.importPublicRoutine(versionId, true);
      await Promise.all([onChanged(), refreshCommunity()]);
      setPublicProfileOpen(false);
      setTab('mine');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      onError(message.includes('Finish or abandon the active workout')
        ? tr('Termina o abandona el entrenamiento en curso antes de activar otra rutina.', 'Finish or abandon the current workout before activating another routine.')
        : message || tr('No se pudo añadir la rutina.', 'The routine could not be added.'));
    } finally {
      setRoutineActionId(null);
    }
  }

  async function openPublicProfile(authorId: string) {
    setPublicProfileOpen(true);
    setPublicProfileLoading(true);
    setPublicProfile(null);
    onError('');
    try {
      setPublicProfile(await workoutRepository.loadPublicAthleteProfile(authorId));
    } catch (error) {
      setPublicProfileOpen(false);
      const message = error instanceof Error ? error.message : '';
      onError(message.includes('Profile is private')
        ? tr('Este atleta tiene el perfil privado.', 'This athlete has a private profile.')
        : message || tr('No se pudo abrir el perfil.', 'The profile could not be opened.'));
    } finally {
      setPublicProfileLoading(false);
    }
  }

  async function loadQuestions(versionId: string) {
    setQuestionsFor(versionId);
    try {
      const loadedQuestions = await workoutRepository.loadRoutineQuestions(versionId);
      setQuestions((current) => ({ ...current, [versionId]: loadedQuestions }));
    } catch (error) {
      onError(error instanceof Error ? error.message : tr('No se pudieron cargar las preguntas.', 'Questions could not be loaded.'));
    }
  }

  async function loadCommunityPlan(versionId: string) {
    if (planFor === versionId) {
      setPlanFor(null);
      return;
    }
    setPlanFor(versionId);
    if (communityPlans[versionId]) return;
    try {
      const loadedPlan = await workoutRepository.loadRoutineVersionDays(versionId);
      setCommunityPlans((current) => ({ ...current, [versionId]: loadedPlan }));
    } catch (error) {
      onError(error instanceof Error ? error.message : tr('No se pudo cargar el plan.', 'The plan could not be loaded.'));
    }
  }

  async function submitQuestion(versionId: string) {
    if (questionText.trim().length < 3) return;
    setSocialSaving(true);
    try {
      await workoutRepository.askRoutineQuestion(versionId, questionText);
      setQuestionText('');
      await loadQuestions(versionId);
      await refreshCommunity();
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : tr('No se pudo enviar la pregunta.', 'The question could not be sent.'));
    } finally {
      setSocialSaving(false);
    }
  }

  async function submitAnswer(versionId: string, questionId: string) {
    const answer = answerDrafts[questionId]?.trim();
    if (!answer) return;
    setSocialSaving(true);
    try {
      await workoutRepository.answerRoutineQuestion(questionId, answer);
      setAnswerDrafts((current) => ({ ...current, [questionId]: '' }));
      await loadQuestions(versionId);
      await Promise.all([refreshCommunity(), onChanged()]);
    } catch (error) {
      onError(error instanceof Error ? error.message : tr('No se pudo guardar la respuesta.', 'The answer could not be saved.'));
    } finally {
      setSocialSaving(false);
    }
  }

  function renderConversation(versionId: string, authorId: string) {
    const routineQuestions = questions[versionId] ?? [];
    return <div className="routine-conversation">
      {authorId !== userId && <form onSubmit={(event) => { event.preventDefault(); void submitQuestion(versionId); }}><label><span className="sr-only">{tr('Pregunta al autor', 'Question for the author')}</span><textarea maxLength={500} value={questionText} onChange={(event) => setQuestionText(event.target.value)} placeholder={tr('Pregunta al autor sobre esta rutina…', 'Ask the author about this routine…')} /></label><Button type="submit" size="sm" disabled={socialSaving || questionText.trim().length < 3}><Send aria-hidden="true" />{tr('Enviar', 'Send')}</Button></form>}
      {routineQuestions.length ? <ul>{routineQuestions.map((question) => <li key={question.id}><div><strong>{question.authorName}</strong><time>{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(question.createdAt))}</time></div><p>{question.body}</p>{question.answer ? <blockquote><strong>{tr('Respuesta del autor', "Author's answer")}</strong><p>{question.answer}</p></blockquote> : authorId === userId ? <form className="answer-form" onSubmit={(event) => { event.preventDefault(); void submitAnswer(versionId, question.id); }}><input maxLength={1000} value={answerDrafts[question.id] ?? ''} onChange={(event) => setAnswerDrafts((current) => ({ ...current, [question.id]: event.target.value }))} placeholder={tr('Escribe una respuesta…', 'Write an answer…')} /><Button type="submit" size="sm" disabled={socialSaving}>{tr('Responder', 'Reply')}</Button></form> : <span className="awaiting-answer">{tr('Pendiente de respuesta', 'Awaiting answer')}</span>}</li>)}</ul> : <p className="conversation-empty">{tr('Todavía no hay preguntas.', 'There are no questions yet.')}</p>}
    </div>;
  }

  return (
    <div className="page-wrap routines-page social-routines-page">
      <header className="top-bar">
        <div className="mobile-brand"><div className="brand-lockup"><span className="brand-mark" aria-hidden="true">H</span><span>HALTERO</span></div></div>
        <div className="date-block"><span>{tr('Rutinas', 'Routines')}</span><strong>{tr('Entrena y comparte', 'Train and share')}</strong></div>
        <Users aria-hidden="true" />
      </header>

      <section className="history-heading routine-hub-heading">
        <div><p className="eyebrow">{tr('Planificación social', 'Social planning')}</p><h1>{tr('Rutinas', 'Routines')}</h1></div>
        <div className="routine-heading-actions"><Button variant="outline" onClick={onGoTraining}>{tr('Entrenamiento de hoy', "Today's training")}</Button><Button onClick={openCreate}><Plus aria-hidden="true" />{tr('Crear rutina', 'Create routine')}</Button></div>
      </section>

      <div className="routine-hub-tabs" role="tablist" aria-label={tr('Secciones de rutinas', 'Routine sections')}>
        <button type="button" role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'is-active' : ''} onClick={() => setTab('mine')}>{tr('Mis rutinas', 'My routines')} <span>{routines.length}</span></button>
        <button type="button" role="tab" aria-selected={tab === 'community'} className={tab === 'community' ? 'is-active' : ''} onClick={() => setTab('community')}>{tr('Comunidad', 'Community')} <Globe2 aria-hidden="true" /></button>
      </div>

      {tab === 'mine' ? (
        routines.length ? <section className="routine-grid social-own-grid" aria-label={tr('Mis rutinas', 'My routines')}>
          {routines.map((routine, index) => {
            const sourceQuestionsExpanded = routine.sourceVersionId !== null && questionsFor === routine.sourceVersionId;
            return <article className={`routine-card social-own-card${routine.active ? ' is-active' : ''}`} key={routine.id}>
              <div className="routine-card-index">{(index + 1).toString().padStart(2, '0')}</div>
              <div className="routine-card-copy">
                <div className="workout-labels"><span>{routine.visibility === 'public' ? <><Globe2 aria-hidden="true" />{tr('Pública', 'Public')}</> : <><Lock aria-hidden="true" />{tr('Privada', 'Private')}</>}</span>{routine.active && <span className="active-routine-label"><CheckCircle2 aria-hidden="true" />{tr('Activa', 'Active')}</span>}<span>{language === 'es' ? levelNames[routine.level][0] : levelNames[routine.level][1]}</span><span>{language === 'es' ? focusNames[routine.focus][0] : focusNames[routine.focus][1]}</span></div>
                <h2>{translateKnownText(language, routine.title)}</h2><p>{translateKnownText(language, routine.description)}</p>
                {routine.sourceVersionId && routine.sourceAuthorName && routine.sourceAuthorId && <button type="button" className="imported-routine-author" onClick={() => void openPublicProfile(routine.sourceAuthorId!)}><div className="community-author-avatar">{routine.sourceAuthorAvatar ? <img src={routine.sourceAuthorAvatar} alt="" /> : personInitials(routine.sourceAuthorName)}</div><div><span>{tr('Rutina de', 'Routine by')}</span><strong>{routine.sourceAuthorName}</strong>{routine.sourceAuthorLevel && <small>{language === 'es' ? levelNames[routine.sourceAuthorLevel][0] : levelNames[routine.sourceAuthorLevel][1]}</small>}</div></button>}
              </div>
              <dl><div><dt>{tr('Duración', 'Duration')}</dt><dd>{routine.weeks} {tr('semanas', 'weeks')}</dd></div><div><dt>{tr('Frecuencia', 'Frequency')}</dt><dd>{routine.daysPerWeek} {tr('días/semana', 'days/week')}</dd></div></dl>
              <div className="routine-card-actions">{routine.active ? <Button disabled><CheckCircle2 aria-hidden="true" />{tr('Rutina activa', 'Active routine')}</Button> : <Button disabled={routineActionId !== null} onClick={() => void activateRoutine(routine.id)}><Play aria-hidden="true" />{routineActionId === routine.id ? tr('Activando…', 'Activating…') : tr('Activar', 'Activate')}</Button>}<Button variant="outline" disabled={editingLoading} onClick={() => void openEdit(routine)}><Pencil aria-hidden="true" />{tr('Editar', 'Edit')}</Button><Button variant="ghost" className="danger-action" onClick={() => setDeleteTarget(routine)}><Trash2 aria-hidden="true" />{tr('Eliminar', 'Delete')}</Button></div>
              {routine.sourceVersionId && routine.sourceAuthorId && <div className="imported-routine-social"><button type="button" className={routine.sourceLikedByMe ? 'social-button is-liked' : 'social-button'} disabled={socialSaving} aria-pressed={routine.sourceLikedByMe} onClick={() => void toggleLike(routine.sourceVersionId!, routine.sourceLikedByMe)}><Heart aria-hidden="true" fill={routine.sourceLikedByMe ? 'currentColor' : 'none'} />{routine.sourceLikeCount}</button><button type="button" className="social-button" onClick={() => sourceQuestionsExpanded ? setQuestionsFor(null) : void loadQuestions(routine.sourceVersionId!)}><MessageCircle aria-hidden="true" />{routine.sourceQuestionCount} {tr('preguntas', 'questions')}</button></div>}
              {routine.sourceVersionId && routine.sourceAuthorId && sourceQuestionsExpanded && renderConversation(routine.sourceVersionId, routine.sourceAuthorId)}
            </article>
          })}
        </section> : <div className="history-empty"><Users aria-hidden="true" /><h3>{tr('Todavía no has creado rutinas', 'You have not created any routines yet')}</h3><p>{tr('Crea una rutina privada o compártela con la comunidad.', 'Create a private routine or share it with the community.')}</p><Button onClick={openCreate}><Plus aria-hidden="true" />{tr('Crear primera rutina', 'Create first routine')}</Button></div>
      ) : (
        <>
          <section className="community-filters" aria-label={tr('Filtros de comunidad', 'Community filters')}>
            <label><span>{tr('Nivel del autor', 'Author level')}</span><select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value as typeof levelFilter)}><option value="all">{tr('Todos los niveles', 'All levels')}</option>{levels.map((level) => <option key={level} value={level}>{language === 'es' ? levelNames[level][0] : levelNames[level][1]}</option>)}</select></label>
            <label><span>{tr('Enfoque', 'Focus')}</span><select value={focusFilter} onChange={(event) => setFocusFilter(event.target.value as typeof focusFilter)}><option value="all">{tr('Todos los enfoques', 'All focuses')}</option>{focuses.map((focus) => <option key={focus} value={focus}>{language === 'es' ? focusNames[focus][0] : focusNames[focus][1]}</option>)}</select></label>
            <span className="community-result-count">{visibleCommunity.length} {tr('rutinas públicas', 'public routines')}</span>
          </section>
          {loadingCommunity ? <div className="history-empty"><p>{tr('Cargando comunidad…', 'Loading community…')}</p></div> : visibleCommunity.length ? <section className="community-grid">
            {visibleCommunity.map((routine) => {
              const expanded = questionsFor === routine.versionId;
              const importedCopy = routines.find((item) => item.sourceVersionId === routine.versionId);
              return <article className="community-routine-card" key={routine.versionId}>
                <header><button type="button" className="community-author-button" onClick={() => void openPublicProfile(routine.authorId)}><div className="community-author-avatar">{routine.authorAvatar ? <img src={routine.authorAvatar} alt="" /> : personInitials(routine.authorName)}</div><div><strong>{routine.authorName}</strong><span>{tr('Nivel', 'Level')}: {language === 'es' ? levelNames[routine.authorLevel][0] : levelNames[routine.authorLevel][1]}</span></div></button><span className="community-focus">{language === 'es' ? focusNames[routine.focus][0] : focusNames[routine.focus][1]}</span></header>
                <div className="community-routine-copy"><h2>{routine.title}</h2><p>{routine.description}</p><div><span>{routine.weeks} {tr('semanas', 'weeks')}</span><span>{routine.daysPerWeek} {tr('días/semana', 'days/week')}</span><span>{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(routine.publishedAt))}</span></div></div>
                <footer><button type="button" className="social-button" onClick={() => void loadCommunityPlan(routine.versionId)}><Dumbbell aria-hidden="true" />{planFor === routine.versionId ? tr('Ocultar plan', 'Hide plan') : tr('Ver plan', 'View plan')}</button><button type="button" className={routine.likedByMe ? 'social-button is-liked' : 'social-button'} disabled={socialSaving} aria-pressed={routine.likedByMe} onClick={() => void toggleLike(routine.versionId, routine.likedByMe)}><Heart aria-hidden="true" fill={routine.likedByMe ? 'currentColor' : 'none'} />{routine.likeCount}</button><button type="button" className="social-button" onClick={() => expanded ? setQuestionsFor(null) : void loadQuestions(routine.versionId)}><MessageCircle aria-hidden="true" />{routine.questionCount} {tr('preguntas', 'questions')}</button>{routine.authorId === userId ? <span className="own-community-routine"><CheckCircle2 aria-hidden="true" />{tr('Tu rutina', 'Your routine')}</span> : <Button size="sm" disabled={routineActionId !== null || importedCopy?.active} onClick={() => void importAndActivateRoutine(routine.versionId)}>{importedCopy?.active ? <CheckCircle2 aria-hidden="true" /> : <Download aria-hidden="true" />}{routineActionId === routine.versionId ? tr('Añadiendo…', 'Adding…') : importedCopy?.active ? tr('Activa', 'Active') : importedCopy ? tr('Activar copia', 'Activate copy') : tr('Añadir y activar', 'Add and activate')}</Button>}</footer>
                {planFor === routine.versionId && <div className="community-plan"><p className="eyebrow">{tr('Plan semanal', 'Weekly plan')}</p>{(communityPlans[routine.versionId] ?? []).map((day, dayIndex) => <section className="community-plan-day" key={`${day.name}-${dayIndex}`}><h4>{day.name}</h4>{day.exercises.map((exercise, index) => <div key={`${exercise.exerciseId}-${index}`}><span>{(index + 1).toString().padStart(2, '0')}</span><strong>{translateKnownText(language, exercise.exerciseName)}</strong><small>{exercise.sets} × {exercise.repetitions} · {exercise.intensityValue} {exercise.intensityType === 'load' ? 'kg' : '%'}</small></div>)}</section>)}</div>}
                {expanded && renderConversation(routine.versionId, routine.authorId)}
              </article>;
            })}
          </section> : <div className="history-empty"><Globe2 aria-hidden="true" /><h3>{tr('No hay rutinas con estos filtros', 'No routines match these filters')}</h3><p>{tr('Cambia el nivel o el enfoque para descubrir más rutinas.', 'Change the level or focus to discover more routines.')}</p></div>}
        </>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="routine-editor-dialog">
          <DialogHeader><DialogTitle>{draft.routineId ? tr('Editar rutina', 'Edit routine') : tr('Crear rutina', 'Create routine')}</DialogTitle><DialogDescription>{creationMode === null ? tr('Elige cómo quieres construir tu nueva rutina.', 'Choose how you want to build your new routine.') : tr('Configura la sesión principal, el nivel y quién puede verla.', 'Configure the main session, level and who can see it.')}</DialogDescription></DialogHeader>
          {!draft.routineId && creationMode === null ? (
            <div className="routine-mode-picker">
              <button type="button" onClick={chooseManualMode}>
                <span className="routine-mode-icon"><SlidersHorizontal aria-hidden="true" /></span>
                <strong>{tr('Crear manualmente', 'Create manually')}</strong>
                <p>{tr('Elige uno a uno los ejercicios, series, repeticiones, cargas y descansos.', 'Choose each exercise, set, repetition, load and rest period yourself.')}</p>
                <small>{tr('Control completo', 'Full control')}</small>
              </button>
              <button type="button" className="is-recommended" onClick={() => generateAssistedRoutine()}>
                <span className="routine-mode-icon"><Bot aria-hidden="true" /></span>
                <strong>{tr('Asistente por reglas', 'Rule-based assistant')}</strong>
                <p>{tr('Genera una propuesta según tu nivel, objetivos, disponibilidad y marcas actuales.', 'Generate a proposal from your level, goals, availability and current results.')}</p>
                <small><Sparkles aria-hidden="true" />{tr('Recomendado', 'Recommended')}</small>
              </button>
            </div>
          ) : (
            <div className="routine-editor-scroll">
              {creationMode === 'assistant' && generationSummary && <section className="routine-assistant-panel">
                <div className="routine-assistant-heading"><span><Bot aria-hidden="true" /></span><div><strong>{tr('Propuesta del asistente por reglas', 'Rule-based assistant proposal')}</strong><p>{tr('Las cargas se han redondeado a discos de 2,5 kg. Puedes editar cualquier resultado antes de guardarlo.', 'Loads have been rounded to 2.5 kg plates. You can edit every result before saving.')}</p></div></div>
                <div className="routine-assistant-facts">
                  <span><strong>{language === 'es' ? levelNames[profile.level][0] : levelNames[profile.level][1]}</strong>{tr('Nivel del perfil', 'Profile level')}</span>
                  <span><strong>{generationSummary.knownLoads}/4</strong>{tr('Marcas conocidas', 'Known results')}</span>
                  <span><strong>{generationSummary.calculatedLoads}</strong>{tr('Cargas calculadas', 'Calculated loads')}</span>
                </div>
                {generationSummary.missingLoads.length > 0 && <p className="routine-assistant-warning">{tr('Sin marca de referencia:', 'Missing reference result:')} {generationSummary.missingLoads.map((lift) => translateKnownText(language, liftDefinitions.find((item) => item.id === lift)?.shortLabel ?? lift)).join(', ')}. {tr('Esos ejercicios se dejan a 0 kg para que elijas una carga técnica.', 'Those exercises remain at 0 kg so you can choose a technical load.')}</p>}
                <div className="routine-assistant-regenerate"><span>{tr('Cambia enfoque, semanas o días abajo y vuelve a generar la propuesta.', 'Change focus, weeks or days below and regenerate the proposal.')}</span><Button variant="outline" size="sm" onClick={() => generateAssistedRoutine(draft)}><Sparkles aria-hidden="true" />{tr('Volver a generar', 'Regenerate')}</Button></div>
              </section>}
              <div className="routine-editor-fields">
                <label className="editor-wide"><span>{tr('Nombre', 'Name')}</span><input maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
                <label className="editor-wide"><span>{tr('Descripción', 'Description')}</span><textarea maxLength={2000} rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
                <label><span>{tr('Nivel de la rutina', 'Routine level')}</span><select value={draft.level} onChange={(event) => setDraft({ ...draft, level: event.target.value as AthleteLevel })}>{levels.map((level) => <option key={level} value={level}>{language === 'es' ? levelNames[level][0] : levelNames[level][1]}</option>)}</select></label>
                <label><span>{tr('Enfoque', 'Focus')}</span><select value={draft.focus} onChange={(event) => setDraft({ ...draft, focus: event.target.value as RoutineFocus })}>{focuses.map((focus) => <option key={focus} value={focus}>{language === 'es' ? focusNames[focus][0] : focusNames[focus][1]}</option>)}</select></label>
                <label><span>{tr('Semanas', 'Weeks')}</span><input type="number" min={1} max={52} value={draft.weeks} onChange={(event) => setDraft({ ...draft, weeks: Number(event.target.value) })} /></label>
                <label><span>{tr('Días por semana', 'Days per week')}</span><input type="number" min={1} max={7} value={draft.daysPerWeek} onChange={(event) => resizeDays(Number(event.target.value))} /></label>
                <label className="editor-wide"><span>{tr('Visibilidad', 'Visibility')}</span><select value={draft.visibility} onChange={(event) => setDraft({ ...draft, visibility: event.target.value as RoutineEditorDraft['visibility'] })}><option value="private">{tr('Privada · solo yo', 'Private · only me')}</option><option value="public">{tr('Pública · visible en Comunidad', 'Public · visible in Community')}</option></select></label>
              </div>
              <section className="routine-day-editor">
                <div className="routine-day-tabs" role="tablist" aria-label={tr('Días de la rutina', 'Routine days')}>
                  {draft.days.map((day, index) => <button type="button" role="tab" aria-selected={activeEditorDay === index} className={activeEditorDay === index ? 'is-active' : ''} onClick={() => setActiveEditorDay(index)} key={`${day.name}-${index}`}><span>{tr('Día', 'Day')} {index + 1}</span><strong>{day.name}</strong></button>)}
                  {draft.days.length < 7 && <button type="button" className="add-routine-day" onClick={addDay}><Plus aria-hidden="true" /><span>{tr('Añadir día', 'Add day')}</span></button>}
                </div>
                {draft.days[activeEditorDay] && <div className="routine-day-name">
                  <label><span>{tr('Nombre del día', 'Day name')}</span><input maxLength={100} value={draft.days[activeEditorDay].name} onChange={(event) => setDraft((current) => ({ ...current, days: current.days.map((day, index) => index === activeEditorDay ? { ...day, name: event.target.value } : day) }))} /></label>
                  {draft.days.length > 1 && <Button variant="ghost" className="danger-action" onClick={() => removeDay(activeEditorDay)}><Trash2 aria-hidden="true" />{tr('Eliminar día', 'Delete day')}</Button>}
                </div>}
              </section>
              <section className="routine-exercise-editor"><div><div><p className="eyebrow">{tr('Ejercicios del día', 'Exercises for this day')}</p><strong>{draft.days[activeEditorDay]?.name}</strong></div><Button variant="outline" size="sm" onClick={() => addExercise(activeEditorDay)}><Plus aria-hidden="true" />{tr('Añadir ejercicio', 'Add exercise')}</Button></div>
                {(draft.days[activeEditorDay]?.exercises ?? []).map((exercise, index) => <article key={`${exercise.exerciseId}-${index}`}>
                  <span className="editor-exercise-number">{(index + 1).toString().padStart(2, '0')}</span>
                  <label className="exercise-select"><span>{tr('Ejercicio', 'Exercise')}</span><select value={exercise.exerciseId} onChange={(event) => { const selected = exercises.find((item) => item.id === event.target.value); updateExercise(activeEditorDay, index, { exerciseId: event.target.value, exerciseName: selected?.name ?? '' }); }}>{exercises.map((item) => <option key={item.id} value={item.id}>{translateKnownText(language, item.name)}</option>)}</select></label>
                  <label><span>{tr('Series', 'Sets')}</span><input type="number" min={1} max={30} value={exercise.sets} onChange={(event) => updateExercise(activeEditorDay, index, { sets: Number(event.target.value) })} /></label>
                  <label><span>{tr('Reps', 'Reps')}</span><input type="number" min={1} max={100} value={exercise.repetitions} onChange={(event) => updateExercise(activeEditorDay, index, { repetitions: Number(event.target.value) })} /></label>
                  <label><span>{tr('Carga', 'Load')}</span><select value={exercise.intensityType} onChange={(event) => updateExercise(activeEditorDay, index, { intensityType: event.target.value as 'load' | 'percentage' })}><option value="load">kg</option><option value="percentage">%</option></select></label>
                  <label><span>{exercise.intensityType === 'load' ? 'kg' : '%'}</span><input type="number" min={0} max={600} step="0.5" value={exercise.intensityValue} onChange={(event) => updateExercise(activeEditorDay, index, { intensityValue: Number(event.target.value) })} /></label>
                  <label><span>{tr('Descanso (s)', 'Rest (s)')}</span><input type="number" min={0} max={3600} step={15} value={exercise.restSeconds} onChange={(event) => updateExercise(activeEditorDay, index, { restSeconds: Number(event.target.value) })} /></label>
                  <label className="exercise-notes"><span>{tr('Notas', 'Notes')}</span><input maxLength={1000} value={exercise.notes} onChange={(event) => updateExercise(activeEditorDay, index, { notes: event.target.value })} /></label>
                  <button type="button" className="remove-exercise" aria-label={tr('Quitar ejercicio', 'Remove exercise')} onClick={() => setDraft((current) => ({ ...current, days: current.days.map((day, dayIndex) => dayIndex === activeEditorDay ? { ...day, exercises: day.exercises.filter((_, exerciseIndex) => exerciseIndex !== index) } : day) }))}><X aria-hidden="true" /></button>
                </article>)}
                {draft.days[activeEditorDay]?.exercises.length === 0 && <div className="routine-day-empty"><Dumbbell aria-hidden="true" /><p>{tr('Añade al menos un ejercicio a este día.', 'Add at least one exercise to this day.')}</p><Button variant="outline" size="sm" onClick={() => addExercise(activeEditorDay)}><Plus aria-hidden="true" />{tr('Añadir ejercicio', 'Add exercise')}</Button></div>}
              </section>
            </div>
          )}
          <DialogFooter>
            {!draft.routineId && creationMode !== null && <Button variant="ghost" onClick={() => setCreationMode(null)}>{tr('Cambiar modo', 'Change mode')}</Button>}
            <Button variant="outline" onClick={() => setEditorOpen(false)}>{tr('Cancelar', 'Cancel')}</Button>
            {creationMode !== null && <Button disabled={saving} onClick={() => void saveRoutine()}>{saving ? tr('Guardando…', 'Saving…') : draft.visibility === 'public' ? tr('Guardar y publicar', 'Save and publish') : tr('Guardar rutina', 'Save routine')}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{tr('¿Eliminar esta rutina?', 'Delete this routine?')}</AlertDialogTitle><AlertDialogDescription>{deleteTarget?.sourceVersionId ? tr('Se eliminará tu copia, pero la rutina original, sus likes y sus preguntas seguirán en la comunidad.', 'Your copy will be removed, but the original routine, its likes and questions will remain in the community.') : tr('Se eliminará su planificación. Los entrenamientos ya registrados se conservarán.', 'Its plan will be removed. Completed training records will be kept.')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{tr('Cancelar', 'Cancel')}</AlertDialogCancel><AlertDialogAction disabled={socialSaving} className="danger-confirm" onClick={() => void deleteRoutine()}>{tr('Eliminar definitivamente', 'Delete permanently')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <PublicAthleteProfileDialog open={publicProfileOpen} onOpenChange={setPublicProfileOpen} profile={publicProfile} loading={publicProfileLoading} busyVersionId={routineActionId} onUseRoutine={(versionId) => void importAndActivateRoutine(versionId)} />
    </div>
  );
}
