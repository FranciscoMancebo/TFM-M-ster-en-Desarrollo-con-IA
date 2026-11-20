'use client';

import { useState } from 'react';
import { ChevronDown, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { translateKnownText, useI18n } from '@/lib/i18n';
import { numberWorkoutSets } from '@/lib/workout/history';
import type { CompletedWorkout, SessionFeeling } from '@/lib/workout/types';

const feelingLabels: Record<SessionFeeling, [string, string]> = {
  poor: ['Mala', 'Poor'],
  okay: ['Normal', 'Okay'],
  good: ['Buena', 'Good'],
  excellent: ['Excelente', 'Excellent'],
};

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDuration(seconds: number) {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

export function WorkoutHistoryList({
  history,
  onGoToTraining,
}: {
  history: CompletedWorkout[];
  onGoToTraining: () => void;
}) {
  const { language, tr } = useI18n();
  const locale = language === 'es' ? 'es-ES' : 'en-GB';
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  if (history.length === 0) {
    return (
      <div className="history-empty">
        <Dumbbell aria-hidden="true" />
        <h3>{tr('Todavía no hay sesiones terminadas', 'No completed sessions yet')}</h3>
        <p>{tr('Cuando finalices un entrenamiento aparecerá aquí con su volumen y resultados.', 'Completed training sessions will appear here with their volume and results.')}</p>
        <Button variant="outline" onClick={onGoToTraining}>{tr('Ver entrenamiento de hoy', "View today's training")}</Button>
      </div>
    );
  }

  return history.map((item) => {
    const expanded = expandedSessionId === item.id;
    const detailId = `session-detail-${item.id}`;
    const rows = numberWorkoutSets(item.sets);

    return (
      <article className={expanded ? 'history-item is-expanded' : 'history-item'} key={item.id}>
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
        <button
          type="button"
          className="history-detail-toggle"
          aria-expanded={expanded}
          aria-controls={detailId}
          onClick={() => setExpandedSessionId(expanded ? null : item.id)}
        >
          {expanded ? tr('Ocultar detalle', 'Hide details') : tr('Ver ejercicios y series', 'View exercises and sets')}
          <ChevronDown aria-hidden="true" />
        </button>
        {expanded && (
          <section className="history-session-detail" id={detailId} aria-label={tr('Detalle del entrenamiento', 'Workout details')}>
            <div className="history-feedback-summary">
              <div><span>{tr('Sensación', 'Feeling')}</span><strong>{item.overallFeeling ? feelingLabels[item.overallFeeling][language === 'es' ? 0 : 1] : '—'}</strong></div>
              <div><span>{tr('Dolor', 'Pain')}</span><strong>{item.painLevel === null ? '—' : `${item.painLevel}/10`}</strong></div>
              <div><span>{tr('Fatiga', 'Fatigue')}</span><strong>{item.fatigueLevel === null ? '—' : `${item.fatigueLevel}/10`}</strong></div>
              <div><span>{tr('Falladas', 'Missed')}</span><strong>{item.failedSets}</strong></div>
              <div><span>{tr('Omitidas', 'Skipped')}</span><strong>{item.omittedSets}</strong></div>
            </div>
            <section className="history-set-table" aria-label={tr('Series realizadas', 'Performed sets')}>
              <table>
                <thead><tr><th>{tr('Ejercicio', 'Exercise')}</th><th>{tr('Serie', 'Set')}</th><th>{tr('Planificado', 'Planned')}</th><th>{tr('Realizado', 'Performed')}</th><th>{tr('Resultado', 'Result')}</th><th>RPE</th></tr></thead>
                <tbody>
                  {rows.map((set, index) => (
                    <tr key={`${set.exerciseId || set.exerciseSlug}-${set.setNumber}-${index}`}>
                      <td>{translateKnownText(language, set.exerciseName)}</td>
                      <td>{set.setNumber}</td>
                      <td>{set.plannedWeight.toLocaleString(locale)} kg × {set.plannedReps}</td>
                      <td>{set.result === 'skipped' ? '—' : `${set.weight.toLocaleString(locale)} kg × ${set.reps}`}</td>
                      <td><span className={`history-result is-${set.result}`}>{set.result === 'success' ? tr('Completada', 'Completed') : set.result === 'miss' ? tr('Fallada', 'Missed') : tr('Omitida', 'Skipped')}</span></td>
                      <td>{set.rpe?.toLocaleString(locale) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </section>
        )}
      </article>
    );
  });
}
