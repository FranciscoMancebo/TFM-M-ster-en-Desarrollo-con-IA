'use client';

import { useMemo, useState } from 'react';
import { Activity, BarChart3, Gauge, Scale, Trophy } from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { translateKnownText, useI18n } from '@/lib/i18n';
import { calculateAdvancedStatistics } from '@/lib/workout/statistics';
import type { CompletedWorkout, LiftRecord, LiftType, TrainingCategory } from '@/lib/workout/types';

const categoryLabels: Record<TrainingCategory, [string, string]> = {
  strength: ['Fuerza', 'Strength'],
  technique: ['Técnica', 'Technique'],
  mobility: ['Movilidad', 'Mobility'],
};

const ratioLabels: Array<[LiftType | 'olympic_total', string, string]> = [
  ['back_squat', 'Sentadilla', 'Back squat'],
  ['front_squat', 'Sentadilla frontal', 'Front squat'],
  ['snatch', 'Arrancada', 'Snatch'],
  ['clean_and_jerk', 'Dos tiempos', 'Clean & jerk'],
  ['olympic_total', 'Total olímpico', 'Olympic total'],
];

export function AdvancedStatistics({
  history,
  records,
  bodyWeightKg,
}: {
  history: CompletedWorkout[];
  records: LiftRecord[];
  bodyWeightKg: number | null;
}) {
  const { language, locale, tr } = useI18n();
  const statistics = useMemo(
    () => calculateAdvancedStatistics(history, records, bodyWeightKg),
    [bodyWeightKg, history, records],
  );
  const [selectedWeek, setSelectedWeek] = useState('');
  const activeWeek = statistics.weeklyVolume.find((week) => week.weekStart === selectedWeek)
    ?? statistics.weeklyVolume[0];
  const maximumExerciseVolume = Math.max(1, ...activeWeek?.exercises.map((exercise) => exercise.volumeKg) ?? [1]);
  const olympicChartData = statistics.olympicTotal.map((point) => ({
    ...point,
    dateLabel: new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' })
      .format(new Date(`${point.date}T12:00:00`)),
  }));
  const chartConfig = {
    totalKg: { label: tr('Total olímpico', 'Olympic total'), color: '#727c1c' },
  };
  const formatWeek = (value: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
    .format(new Date(`${value}T12:00:00`));

  return (
    <section className="advanced-statistics" aria-labelledby="advanced-statistics-title">
      <div className="section-heading advanced-statistics-heading">
        <div><p className="eyebrow">{tr('Análisis', 'Analysis')}</p><h2 id="advanced-statistics-title">{tr('Estadísticas avanzadas', 'Advanced statistics')}</h2></div>
        <p>{tr('Carga, intensidad y equilibrio del trabajo registrado.', 'Load, intensity and balance across your recorded training.')}</p>
      </div>

      <div className="advanced-statistics-grid">
        <article className="statistics-card weekly-volume-card">
          <header><span><BarChart3 aria-hidden="true" /></span><div><p>{tr('Volumen', 'Volume')}</p><h3>{tr('Por ejercicio y semana', 'By exercise and week')}</h3></div></header>
          {activeWeek ? (
            <>
              <div className="statistics-week-select">
                <label><span>{tr('Semana del', 'Week of')}</span><select value={activeWeek.weekStart} onChange={(event) => setSelectedWeek(event.target.value)}>{statistics.weeklyVolume.map((week) => <option key={week.weekStart} value={week.weekStart}>{formatWeek(week.weekStart)}</option>)}</select></label>
                <strong>{activeWeek.totalVolumeKg.toLocaleString(locale)} kg</strong>
              </div>
              <div className="exercise-volume-list">
                {activeWeek.exercises.map((exercise) => (
                  <div key={exercise.exerciseId}>
                    <span>{translateKnownText(language, exercise.exerciseName)}</span><strong>{exercise.volumeKg.toLocaleString(locale)} kg</strong>
                    <i aria-hidden="true"><b style={{ width: `${exercise.volumeKg / maximumExerciseVolume * 100}%` }} /></i>
                  </div>
                ))}
              </div>
            </>
          ) : <EmptyStatistic text={tr('Completa una sesión con carga para calcular el volumen semanal.', 'Complete a loaded session to calculate weekly volume.')} />}
        </article>

        <article className="statistics-card intensity-card">
          <header><span><Gauge aria-hidden="true" /></span><div><p>{tr('Intensidad', 'Intensity')}</p><h3>{tr('Media relativa', 'Relative average')}</h3></div></header>
          {statistics.averageIntensityPercentage === null ? (
            <EmptyStatistic text={tr('Necesitas marcas compatibles para calcular la intensidad relativa.', 'Compatible reference lifts are required to calculate relative intensity.')} />
          ) : (
            <div className="intensity-metric">
              <strong>{statistics.averageIntensityPercentage.toLocaleString(locale)}%</strong>
              <div><i aria-hidden="true" style={{ width: `${Math.min(statistics.averageIntensityPercentage, 100)}%` }} /></div>
              <p>{tr('Ponderada por repeticiones usando la marca vigente en cada fecha.', 'Weighted by repetitions using the reference current on each date.')}</p>
              <small>{statistics.intensityCoveredSets}/{statistics.loadedCompletedSets} {tr('series con referencia', 'sets with a reference')}</small>
            </div>
          )}
        </article>

        <article className="statistics-card distribution-card">
          <header><span><Activity aria-hidden="true" /></span><div><p>{tr('Distribución', 'Distribution')}</p><h3>{tr('Equilibrio del entrenamiento', 'Training balance')}</h3></div></header>
          {statistics.distribution.every((item) => item.completedSets === 0) ? <EmptyStatistic text={tr('Aún no hay series completadas para clasificar.', 'There are no completed sets to classify yet.')} /> : (
            <div className="training-distribution">
              {statistics.distribution.map((item) => (
                <div key={item.category} className={`is-${item.category}`}>
                  <span>{tr(...categoryLabels[item.category])}</span><strong>{item.percentage.toLocaleString(locale)}%</strong>
                  <i aria-hidden="true"><b style={{ width: `${item.percentage}%` }} /></i>
                  <small>{item.completedSets} {tr('series', 'sets')}</small>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="statistics-card olympic-total-card">
          <header><span><Trophy aria-hidden="true" /></span><div><p>{tr('Progreso', 'Progress')}</p><h3>{tr('Total olímpico', 'Olympic total')}</h3></div></header>
          {olympicChartData.length ? (
            <>
              <div className="olympic-total-current"><strong>{olympicChartData.at(-1)?.totalKg.toLocaleString(locale)} kg</strong><span>{olympicChartData.at(-1)?.snatchKg.toLocaleString(locale)} + {olympicChartData.at(-1)?.cleanAndJerkKg.toLocaleString(locale)} kg</span></div>
              <ChartContainer config={chartConfig} className="olympic-total-chart" initialDimension={{ width: 620, height: 230 }}>
                <LineChart data={olympicChartData} margin={{ top: 12, right: 18, left: -16, bottom: 0 }} accessibilityLayer>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} unit=" kg" width={62} domain={['dataMin - 5', 'dataMax + 5']} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(value) => <strong>{Number(value).toLocaleString(locale)} kg</strong>} />} />
                  <Line dataKey="totalKg" type="monotone" stroke="var(--color-totalKg)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-totalKg)' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ChartContainer>
            </>
          ) : <EmptyStatistic text={tr('Registra arrancada y dos tiempos para calcular el total.', 'Record both snatch and clean & jerk to calculate your total.')} />}
        </article>

        <article className="statistics-card bodyweight-card">
          <header><span><Scale aria-hidden="true" /></span><div><p>{tr('Peso corporal', 'Body weight')}</p><h3>{tr('Fuerza relativa', 'Relative strength')}</h3></div></header>
          {!bodyWeightKg ? <EmptyStatistic text={tr('Añade tu peso corporal en Perfil para calcular las relaciones.', 'Add your body weight in Profile to calculate ratios.')} /> : (
            <>
              <div className="bodyweight-reference"><span>{tr('Peso actual', 'Current weight')}</span><strong>{bodyWeightKg.toLocaleString(locale)} kg</strong></div>
              <dl className="bodyweight-ratios">
                {ratioLabels.map(([key, spanish, english]) => <div key={key}><dt>{tr(spanish, english)}</dt><dd>{statistics.bodyWeightRatios[key] === undefined ? '—' : `${statistics.bodyWeightRatios[key]?.toLocaleString(locale)}×`}</dd></div>)}
              </dl>
            </>
          )}
        </article>
      </div>
    </section>
  );
}

function EmptyStatistic({ text }: { text: string }) {
  return <div className="statistics-empty"><p>{text}</p></div>;
}
