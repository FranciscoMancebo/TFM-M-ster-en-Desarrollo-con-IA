'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calculator, Dumbbell, Layers3 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { workoutRepository } from '@/lib/workout/repository';
import type { ExerciseRecord } from '@/lib/workout/types';

export function PerformanceRecords({ userId, onError }: { userId: string; onError: (message: string) => void }) {
  const { locale, tr } = useI18n();
  const [records, setRecords] = useState<ExerciseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void workoutRepository.loadExerciseRecords(userId)
        .then(setRecords)
        .catch((error) => onError(error instanceof Error ? error.message : tr('No se pudieron cargar los récords por repeticiones.', 'Rep records could not be loaded.')))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [onError, tr, userId]);

  const groups = useMemo(() => {
    const byExercise = new Map<string, { name: string; isVariant: boolean; records: Map<number, ExerciseRecord> }>();
    for (const record of records) {
      const group = byExercise.get(record.exerciseId) ?? { name: record.exerciseName, isVariant: record.isVariant, records: new Map() };
      const current = group.records.get(record.repetitions);
      if (!current || record.weightKg > current.weightKg) group.records.set(record.repetitions, record);
      byExercise.set(record.exerciseId, group);
    }
    return [...byExercise.entries()].sort((left, right) => Number(left[1].isVariant) - Number(right[1].isVariant) || left[1].name.localeCompare(right[1].name));
  }, [records]);

  return (
    <section className="performance-records" aria-labelledby="performance-records-title">
      <div className="section-heading">
        <div><p className="eyebrow">{tr('Récords de rendimiento', 'Performance records')}</p><h2 id="performance-records-title">{tr('1RM, 2RM, 3RM y 5RM', '1RM, 2RM, 3RM and 5RM')}</h2></div>
        <p>{tr('Cada variante mantiene su propio historial.', 'Each variation keeps its own history.')}</p>
      </div>
      {loading ? <div className="performance-records-empty">{tr('Cargando récords…', 'Loading records…')}</div> : groups.length === 0 ? (
        <div className="performance-records-empty"><Dumbbell aria-hidden="true" /><p>{tr('Completa series de 1, 2, 3 o 5 repeticiones para detectar tus primeros récords.', 'Complete sets of 1, 2, 3 or 5 reps to detect your first records.')}</p></div>
      ) : (
        <div className="performance-record-grid">
          {groups.map(([exerciseId, group]) => (
            <article key={exerciseId}>
              <header><div><span>{group.isVariant ? <Layers3 aria-hidden="true" /> : <Dumbbell aria-hidden="true" />}{group.isVariant ? tr('Variante', 'Variation') : tr('Movimiento principal', 'Main lift')}</span><h3>{group.name}</h3></div></header>
              <div className="rep-record-grid">
                {[1, 2, 3, 5].map((repetitions) => {
                  const record = group.records.get(repetitions);
                  return <div className={record ? '' : 'is-empty'} key={repetitions}><span>{repetitions}RM</span><strong>{record ? `${record.weightKg.toLocaleString(locale)} kg` : '—'}</strong>{record && <small>{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${record.achievedOn}T12:00:00`))}</small>}</div>;
                })}
              </div>
              {group.records.size > 0 && <p><Calculator aria-hidden="true" />{tr('1RM estimado más alto', 'Highest estimated 1RM')}: <strong>{Math.max(...[...group.records.values()].map((record) => record.estimated1RmKg)).toLocaleString(locale)} kg</strong></p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
