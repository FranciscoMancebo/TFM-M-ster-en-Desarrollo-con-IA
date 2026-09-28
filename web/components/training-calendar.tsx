'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BedDouble,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Medal,
  Pencil,
  Plus,
  RotateCcw,
  SkipForward,
  Trash2,
  Trophy,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { requestGamificationCheck } from '@/components/gamification-celebration';
import { useI18n } from '@/lib/i18n';
import {
  calendarDate,
  calendarDateKey,
  calendarDays,
  calendarRange,
  shiftCalendarAnchor,
  startOfCalendarWeek,
  type CalendarViewMode,
} from '@/lib/workout/calendar';
import { todayForInput } from '@/lib/workout/lifts';
import { workoutRepository } from '@/lib/workout/repository';
import type {
  AdherenceOverview,
  CalendarEventStatus,
  CalendarEventType,
  CalendarRoutineDay,
  TrainingCalendarEvent,
} from '@/lib/workout/types';

const emptyAdherence: AdherenceOverview = {
  week: { planned: 0, completed: 0, skipped: 0, pending: 0, percentage: 0 },
  month: { planned: 0, completed: 0, skipped: 0, pending: 0, percentage: 0 },
  currentStreak: 0,
  perfectWeeks: 0,
};

type EventForm = {
  scheduledOn: string;
  eventType: CalendarEventType;
  routineDayId: string;
  title: string;
  notes: string;
};

export function TrainingCalendar({
  userId,
  routineVersionId,
  hasActiveSession,
  onStartWorkout,
  onError,
}: {
  userId: string;
  routineVersionId: string | null;
  hasActiveSession: boolean;
  onStartWorkout: (routineDayId: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const { language, locale, tr } = useI18n();
  const today = todayForInput();
  const [mode, setMode] = useState<CalendarViewMode>('month');
  const [anchor, setAnchor] = useState(() => calendarDate(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [events, setEvents] = useState<TrainingCalendarEvent[]>([]);
  const [routineDays, setRoutineDays] = useState<CalendarRoutineDay[]>([]);
  const [adherence, setAdherence] = useState(emptyAdherence);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TrainingCalendarEvent | null>(null);
  const [form, setForm] = useState<EventForm>({
    scheduledOn: today,
    eventType: 'workout',
    routineDayId: '',
    title: '',
    notes: '',
  });

  const days = useMemo(() => calendarDays(anchor, mode), [anchor, mode]);
  const range = useMemo(() => calendarRange(anchor, mode), [anchor, mode]);
  const eventsByDate = useMemo(() => {
    const result = new Map<string, TrainingCalendarEvent>();
    for (const event of events) result.set(event.scheduledOn, event);
    return result;
  }, [events]);
  const selectedEvent = eventsByDate.get(selectedDate) ?? null;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [loadedEvents, loadedAdherence, loadedRoutineDays] = await Promise.all([
        workoutRepository.loadCalendarEvents(userId, range.from, range.to),
        workoutRepository.loadAdherenceOverview(),
        routineVersionId
          ? workoutRepository.loadCalendarRoutineDays(routineVersionId)
          : Promise.resolve([]),
      ]);
      setEvents(loadedEvents);
      setAdherence(loadedAdherence);
      setRoutineDays(loadedRoutineDays);
    } catch (error) {
      onError(error instanceof Error ? error.message : tr('No se pudo cargar el calendario.', 'The calendar could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [onError, range.from, range.to, routineVersionId, tr, userId]);

  useEffect(() => {
    const timerId = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(timerId);
  }, [reload]);

  function openCreate(date = selectedDate) {
    const firstDay = routineDays[0] ?? null;
    setEditingEvent(null);
    setForm({
      scheduledOn: date,
      eventType: firstDay ? 'workout' : 'rest',
      routineDayId: firstDay?.id ?? '',
      title: firstDay?.name ?? tr('Descanso', 'Rest'),
      notes: '',
    });
    setDialogOpen(true);
  }

  function openReschedule(event: TrainingCalendarEvent) {
    setEditingEvent(event);
    setForm({
      scheduledOn: event.scheduledOn,
      eventType: event.eventType,
      routineDayId: event.routineDayId ?? '',
      title: event.title,
      notes: event.notes,
    });
    setDialogOpen(true);
  }

  function changeEventType(eventType: CalendarEventType) {
    const defaultTitles: Record<CalendarEventType, string> = {
      workout: routineDays[0]?.name ?? tr('Entrenamiento', 'Workout'),
      rest: tr('Descanso', 'Rest'),
      competition: tr('Competición', 'Competition'),
      free_session: tr('Sesión libre', 'Free session'),
    };
    setForm((current) => ({
      ...current,
      eventType,
      routineDayId: eventType === 'workout' ? current.routineDayId || routineDays[0]?.id || '' : '',
      title: defaultTitles[eventType],
    }));
  }

  async function saveEvent(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!form.title.trim()) return;
    if (form.eventType === 'workout' && !form.routineDayId) {
      onError(tr('Selecciona un día de la rutina activa.', 'Select a day from the active routine.'));
      return;
    }
    setSaving(true);
    onError('');
    try {
      if (editingEvent) {
        await workoutRepository.rescheduleCalendarEvent(userId, editingEvent, form.scheduledOn, form.notes);
      } else {
        await workoutRepository.createCalendarEvent(userId, {
          scheduledOn: form.scheduledOn,
          eventType: form.eventType,
          status: 'planned',
          title: form.title,
          notes: form.notes,
          routineDayId: form.eventType === 'workout' ? form.routineDayId : null,
        });
      }
      setSelectedDate(form.scheduledOn);
      setDialogOpen(false);
      await reload();
      requestGamificationCheck();
    } catch (error) {
      onError(error instanceof Error ? error.message : tr('No se pudo guardar la planificación.', 'The schedule could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(event: TrainingCalendarEvent, status: CalendarEventStatus) {
    onError('');
    try {
      await workoutRepository.updateCalendarEventStatus(userId, event.id, status);
      await reload();
      requestGamificationCheck();
    } catch (error) {
      onError(error instanceof Error ? error.message : tr('No se pudo actualizar el día.', 'The day could not be updated.'));
    }
  }

  async function removeEvent(event: TrainingCalendarEvent) {
    onError('');
    try {
      await workoutRepository.deleteCalendarEvent(userId, event.id);
      await reload();
    } catch (error) {
      onError(error instanceof Error ? error.message : tr('No se pudo eliminar el día.', 'The day could not be removed.'));
    }
  }

  async function startWorkout(event: TrainingCalendarEvent) {
    if (!event.routineDayId) return;
    onError('');
    try {
      await onStartWorkout(event.routineDayId);
    } catch (error) {
      onError(error instanceof Error ? error.message : tr('No se pudo iniciar el entrenamiento.', 'The workout could not be started.'));
    }
  }

  const periodTitle = mode === 'month'
    ? new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(anchor)
    : `${formatShortDate(startOfCalendarWeek(anchor), locale)} — ${formatShortDate(days[6], locale)}`;
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2026, 8, 21 + index, 12);
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date).replace('.', '');
  });

  return (
    <div className="page-wrap calendar-page">
      <header className="calendar-heading">
        <div><p className="eyebrow">{tr('Planificación', 'Planning')}</p><h1>{tr('Calendario de entrenamiento', 'Training calendar')}</h1></div>
        <Button onClick={() => openCreate()}><Plus aria-hidden="true" />{tr('Añadir día', 'Add day')}</Button>
      </header>

      <section className="adherence-grid" aria-label={tr('Seguimiento de adherencia', 'Adherence tracking')}>
        <article><span><CalendarDays aria-hidden="true" />{tr('Esta semana', 'This week')}</span><strong>{adherence.week.percentage}%</strong><small>{adherence.week.completed}/{adherence.week.planned} {tr('días completados', 'days completed')}</small></article>
        <article><span><Medal aria-hidden="true" />{tr('Este mes', 'This month')}</span><strong>{adherence.month.percentage}%</strong><small>{adherence.month.completed}/{adherence.month.planned} {tr('días completados', 'days completed')}</small></article>
        <article><span><Flame aria-hidden="true" />{tr('Racha actual', 'Current streak')}</span><strong>{adherence.currentStreak}</strong><small>{tr('entrenamientos seguidos', 'consecutive workouts')}</small></article>
        <article><span><Trophy aria-hidden="true" />{tr('Semanas perfectas', 'Perfect weeks')}</span><strong>{adherence.perfectWeeks}</strong><small>{tr('sin días omitidos', 'without skipped days')}</small></article>
      </section>

      <section className="calendar-shell">
        <div className="calendar-toolbar">
          <div className="calendar-navigation">
            <Button variant="outline" size="icon" aria-label={tr('Periodo anterior', 'Previous period')} onClick={() => setAnchor((current) => shiftCalendarAnchor(current, mode, -1))}><ChevronLeft /></Button>
            <Button variant="outline" onClick={() => { setAnchor(calendarDate(today)); setSelectedDate(today); }}>{tr('Hoy', 'Today')}</Button>
            <Button variant="outline" size="icon" aria-label={tr('Periodo siguiente', 'Next period')} onClick={() => setAnchor((current) => shiftCalendarAnchor(current, mode, 1))}><ChevronRight /></Button>
          </div>
          <h2>{periodTitle}</h2>
          <div className="calendar-mode" aria-label={tr('Vista del calendario', 'Calendar view')}>
            <button type="button" className={mode === 'week' ? 'is-active' : ''} onClick={() => setMode('week')}>{tr('Semana', 'Week')}</button>
            <button type="button" className={mode === 'month' ? 'is-active' : ''} onClick={() => setMode('month')}>{tr('Mes', 'Month')}</button>
          </div>
        </div>

        <div className="calendar-scroll">
          <div className={`calendar-grid is-${mode}`} aria-busy={loading}>
            {weekdayLabels.map((label) => <span className="calendar-weekday" key={label}>{label}</span>)}
            {days.map((day) => {
              const dateKey = calendarDateKey(day);
              const event = eventsByDate.get(dateKey);
              const isOutside = mode === 'month' && day.getMonth() !== anchor.getMonth();
              const meta = event ? eventPresentation(event, tr) : null;
              const Icon = meta?.icon;
              return (
                <button
                  type="button"
                  key={dateKey}
                  className={`calendar-day${dateKey === today ? ' is-today' : ''}${dateKey === selectedDate ? ' is-selected' : ''}${isOutside ? ' is-outside' : ''}`}
                  onClick={() => setSelectedDate(dateKey)}
                  aria-label={new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(day)}
                >
                  <span className="calendar-day-number">{day.getDate()}</span>
                  {event && meta && Icon ? (
                    <span className={`calendar-event is-${event.eventType} is-${meta.state}`}>
                      <Icon aria-hidden="true" />
                      <span>{event.title}</span>
                      <small>{meta.status}</small>
                    </span>
                  ) : <span className="calendar-day-empty">+</span>}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="calendar-day-detail" aria-live="polite">
        <header>
          <div><p className="eyebrow">{new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(calendarDate(selectedDate))}</p><h2>{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(calendarDate(selectedDate))}</h2></div>
          {!selectedEvent && <Button variant="outline" onClick={() => openCreate(selectedDate)}><Plus aria-hidden="true" />{tr('Planificar', 'Schedule')}</Button>}
        </header>
        {selectedEvent ? <CalendarEventDetail
          event={selectedEvent}
          today={today}
          language={language}
          hasActiveSession={hasActiveSession}
          tr={tr}
          onStart={() => void startWorkout(selectedEvent)}
          onComplete={() => void updateStatus(selectedEvent, 'completed')}
          onSkip={() => void updateStatus(selectedEvent, 'skipped')}
          onReopen={() => void updateStatus(selectedEvent, 'planned')}
          onReschedule={() => openReschedule(selectedEvent)}
          onDelete={() => void removeEvent(selectedEvent)}
        /> : <div className="calendar-empty-day"><CalendarDays aria-hidden="true" /><p>{tr('No hay nada planificado para este día.', 'Nothing is scheduled for this day.')}</p></div>}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="calendar-dialog">
          <DialogHeader>
            <DialogTitle>{editingEvent ? tr('Reprogramar día', 'Reschedule day') : tr('Planificar un día', 'Schedule a day')}</DialogTitle>
            <DialogDescription>{editingEvent
              ? tr('La fecha anterior quedará registrada como referencia.', 'The previous date will remain recorded for reference.')
              : tr('Añade un entrenamiento, descanso, competición o sesión libre.', 'Add a workout, rest day, competition or free session.')}</DialogDescription>
          </DialogHeader>
          <form id="calendar-event-form" className="calendar-form" onSubmit={saveEvent}>
            <label><span>{tr('Fecha', 'Date')}</span><input required type="date" value={form.scheduledOn} onChange={(event) => setForm({ ...form, scheduledOn: event.target.value })} /></label>
            {!editingEvent && <label><span>{tr('Tipo de día', 'Day type')}</span><select value={form.eventType} onChange={(event) => changeEventType(event.target.value as CalendarEventType)}>
              <option value="workout" disabled={routineDays.length === 0}>{tr('Entrenamiento de rutina', 'Routine workout')}</option>
              <option value="rest">{tr('Descanso', 'Rest')}</option>
              <option value="competition">{tr('Competición', 'Competition')}</option>
              <option value="free_session">{tr('Sesión libre', 'Free session')}</option>
            </select></label>}
            {!editingEvent && form.eventType === 'workout' && <label><span>{tr('Día de la rutina', 'Routine day')}</span><select required value={form.routineDayId} onChange={(event) => {
              const routineDay = routineDays.find((day) => day.id === event.target.value);
              setForm({ ...form, routineDayId: event.target.value, title: routineDay?.name ?? form.title });
            }}>
              {routineDays.map((day) => <option value={day.id} key={day.id}>{tr('Día', 'Day')} {day.dayIndex} · {day.name}</option>)}
            </select></label>}
            {!editingEvent && <label><span>{tr('Título', 'Title')}</span><input required minLength={2} maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>}
            <label><span>{tr('Notas', 'Notes')}</span><textarea maxLength={1000} rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder={tr('Opcional', 'Optional')} /></label>
          </form>
          <DialogFooter>
            <Button type="submit" form="calendar-event-form" disabled={saving}>{saving ? tr('Guardando…', 'Saving…') : editingEvent ? tr('Reprogramar', 'Reschedule') : tr('Guardar día', 'Save day')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CalendarEventDetail({
  event,
  today,
  language,
  hasActiveSession,
  tr,
  onStart,
  onComplete,
  onSkip,
  onReopen,
  onReschedule,
  onDelete,
}: {
  event: TrainingCalendarEvent;
  today: string;
  language: string;
  hasActiveSession: boolean;
  tr: (spanish: string, english: string) => string;
  onStart: () => void;
  onComplete: () => void;
  onSkip: () => void;
  onReopen: () => void;
  onReschedule: () => void;
  onDelete: () => void;
}) {
  const meta = eventPresentation(event, tr);
  const Icon = meta.icon;
  const canStart = event.eventType === 'workout' && event.scheduledOn === today && event.status === 'planned' && !hasActiveSession;
  const canCompleteManually = event.eventType !== 'workout' && event.status === 'planned';
  return (
    <article className={`calendar-detail-card is-${event.eventType}`}>
      <div className="calendar-detail-icon"><Icon aria-hidden="true" /></div>
      <div className="calendar-detail-copy">
        <span>{meta.type}</span>
        <h3>{event.title}</h3>
        <p>{event.notes || tr('Sin notas adicionales.', 'No additional notes.')}</p>
        {event.routineDayName && <small>{tr('Día de rutina', 'Routine day')}: {event.routineDayIndex} · {event.routineDayName}</small>}
        {event.rescheduledFrom && <small><RotateCcw aria-hidden="true" />{tr('Reprogramado desde', 'Rescheduled from')} {formatCompactDate(event.rescheduledFrom, language)}</small>}
      </div>
      <div className="calendar-detail-state"><span className={`is-${meta.state}`}>{meta.status}</span></div>
      <div className="calendar-detail-actions">
        {canStart && <Button onClick={onStart}><Dumbbell aria-hidden="true" />{tr('Empezar', 'Start')}</Button>}
        {canCompleteManually && <Button onClick={onComplete}><Check aria-hidden="true" />{tr('Completar', 'Complete')}</Button>}
        {event.status === 'planned' && <Button variant="outline" onClick={onSkip}><SkipForward aria-hidden="true" />{tr('Omitir', 'Skip')}</Button>}
        {event.status === 'skipped' && <Button variant="outline" onClick={onReopen}><RotateCcw aria-hidden="true" />{tr('Reabrir', 'Reopen')}</Button>}
        {event.status !== 'completed' && <Button variant="outline" onClick={onReschedule}><Pencil aria-hidden="true" />{tr('Reprogramar', 'Reschedule')}</Button>}
        {!event.workoutSessionId && <Button variant="ghost" onClick={onDelete}><Trash2 aria-hidden="true" />{tr('Eliminar', 'Delete')}</Button>}
      </div>
    </article>
  );
}

function eventPresentation(event: TrainingCalendarEvent, tr: (spanish: string, english: string) => string) {
  const types = {
    workout: { type: tr('Entrenamiento', 'Workout'), icon: Dumbbell },
    rest: { type: tr('Descanso', 'Rest'), icon: BedDouble },
    competition: { type: tr('Competición', 'Competition'), icon: Trophy },
    free_session: { type: tr('Sesión libre', 'Free session'), icon: Zap },
  };
  const state = event.status === 'completed'
    ? 'completed'
    : event.status === 'skipped'
      ? 'skipped'
      : event.rescheduledFrom
        ? 'rescheduled'
        : 'planned';
  const statuses = {
    completed: tr('Completado', 'Completed'),
    skipped: tr('Omitido', 'Skipped'),
    rescheduled: tr('Reprogramado', 'Rescheduled'),
    planned: tr('Pendiente', 'Pending'),
  };
  return { ...types[event.eventType], state, status: statuses[state] };
}

function formatShortDate(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(value);
}

function formatCompactDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'es-ES', { day: 'numeric', month: 'short' }).format(calendarDate(value));
}
