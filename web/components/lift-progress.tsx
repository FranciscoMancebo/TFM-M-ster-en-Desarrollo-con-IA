'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { translateKnownText, useI18n } from '@/lib/i18n';
import { liftDefinitions, latestLiftRecords, todayForInput } from '@/lib/workout/lifts';
import { workoutRepository } from '@/lib/workout/repository';
import type { LiftRecord, LiftType } from '@/lib/workout/types';

export function LiftProgress({
  userId,
  records,
  onRecordsChange,
  onError,
}: {
  userId: string;
  records: LiftRecord[];
  onRecordsChange: (records: LiftRecord[]) => void;
  onError: (message: string) => void;
}) {
  const { language, locale, tr } = useI18n();
  const chartConfig = { weight: { label: tr('Marca', 'Result'), color: '#7f881e' } };
  const [selectedLift, setSelectedLift] = useState<LiftType>('back_squat');
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(todayForInput());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const latest = useMemo(() => latestLiftRecords(records), [records]);
  const definition = liftDefinitions.find((lift) => lift.id === selectedLift) ?? liftDefinitions[0];
  const selectedRecords = records.filter((record) => record.lift === selectedLift);
  const chartData = selectedRecords.map((record) => ({
    date: record.achievedOn,
    dateLabel: new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(new Date(`${record.achievedOn}T12:00:00`)),
    weight: record.weightKg,
  }));
  const change = selectedRecords.length > 1
    ? selectedRecords[selectedRecords.length - 1].weightKg - selectedRecords[0].weightKg
    : 0;

  async function submit(event: { preventDefault: () => void }) {
    event.preventDefault();
    const parsedWeight = Number(weight);
    if (!parsedWeight || parsedWeight < 1 || parsedWeight > 600) {
      onError(tr('Introduce una marca entre 1 y 600 kg.', 'Enter a result between 1 and 600 kg.'));
      return;
    }
    setSaving(true);
    setSaved(false);
    onError('');
    try {
      const updated = await workoutRepository.saveLiftRecords(userId, [{
        lift: selectedLift,
        weightKg: parsedWeight,
        achievedOn: date,
        source: 'manual',
      }]);
      onRecordsChange(updated);
      setWeight('');
      setSaved(true);
    } catch (error) {
      onError(error instanceof Error ? error.message : tr('No se pudo guardar la marca.', 'The result could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="lift-progress" aria-labelledby="lift-progress-title">
      <div className="section-heading lift-progress-heading">
        <div><p className="eyebrow">{tr('Marcas de referencia', 'Reference lifts')}</p><h2 id="lift-progress-title">{tr('Evolución de fuerza', 'Strength progress')}</h2></div>
        <p>{tr('Las marcas más recientes calculan los porcentajes de tus rutinas.', 'Your latest results are used to calculate routine percentages.')}</p>
      </div>

      <ul className="lift-current-grid" aria-label={tr('Marcas actuales', 'Current results')}>
        {liftDefinitions.map((lift) => {
          const current = latest.get(lift.id);
          return (
            <li key={lift.id}><button type="button" className={selectedLift === lift.id ? 'is-selected' : ''} onClick={() => setSelectedLift(lift.id)}>
                <span>{translateKnownText(language, lift.shortLabel)}</span>
                <strong>{current ? `${current.weightKg} kg` : tr('Sin datos', 'No data')}</strong>
                <small>{current ? formatRecordDate(current.achievedOn, locale) : tr('Añade tu primera marca', 'Add your first result')}</small>
              </button></li>
          );
        })}
      </ul>

      <div className="lift-detail-grid">
        <article className="lift-chart-card">
          <header>
            <div><span>{translateKnownText(language, definition.label)}</span><strong>{latest.get(selectedLift)?.weightKg ?? '—'}{latest.has(selectedLift) ? ' kg' : ''}</strong></div>
            {selectedRecords.length > 1 && <p className={change >= 0 ? 'positive' : 'negative'}>{change >= 0 ? '+' : ''}{change.toLocaleString(locale)} kg {tr('desde el primer registro', 'since the first result')}</p>}
          </header>
          {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="lift-chart" initialDimension={{ width: 560, height: 260 }}>
              <LineChart data={chartData} margin={{ top: 18, right: 18, left: -12, bottom: 4 }} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} unit=" kg" width={58} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(value) => <><strong>{Number(value).toLocaleString(locale)} kg</strong></>} />} />
                <Line dataKey="weight" type="monotone" stroke="var(--color-weight)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-weight)' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="lift-chart-empty"><span>{tr('Sin registros todavía', 'No results yet')}</span><p>{tr('Añade una marca para empezar a ver tu evolución.', 'Add a result to start tracking your progress.')}</p></div>
          )}
        </article>

        <form className="lift-entry-card" onSubmit={submit}>
          <div><p className="eyebrow">{tr('Nuevo registro', 'New result')}</p><h3>{tr('Actualizar marca', 'Update result')}</h3></div>
          <div className="lift-entry-selection"><span>{tr('Movimiento seleccionado', 'Selected lift')}</span><strong>{translateKnownText(language, definition.label)}</strong></div>
          <label><span>{tr('Peso', 'Weight')}</span><div className="unit-input"><input required type="number" min={1} max={600} step="0.5" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="0" /><small>kg</small></div></label>
          <label><span>{tr('Fecha', 'Date')}</span><div className="date-input"><CalendarDays aria-hidden="true" /><input required type="date" max={todayForInput()} value={date} onChange={(event) => setDate(event.target.value)} /></div></label>
          {saved && <output className="record-saved">{tr('Marca guardada', 'Result saved')}</output>}
          <Button type="submit" disabled={saving}><Plus aria-hidden="true" />{saving ? tr('Guardando…', 'Saving…') : tr('Añadir marca', 'Add result')}</Button>
        </form>
      </div>
    </section>
  );
}

function formatRecordDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(`${value}T12:00:00`));
}
