'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Download, Dumbbell, EyeOff, Heart, MessageCircle, Trophy } from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { translateKnownText, useI18n } from '@/lib/i18n';
import { liftDefinitions, latestLiftRecords } from '@/lib/workout/lifts';
import type { AthleteLevel, LiftType, PublicAthleteProfile, RoutineFocus, WeightliftingExperience } from '@/lib/workout/types';

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

const experienceNames: Record<WeightliftingExperience, [string, string]> = {
  never: ['Sin experiencia previa', 'No previous experience'],
  under_6_months: ['Menos de 6 meses', 'Less than 6 months'],
  six_to_twenty_four_months: ['Entre 6 meses y 2 años', '6 months to 2 years'],
  over_two_years: ['Más de 2 años', 'More than 2 years'],
};

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function PublicAthleteProfileDialog({
  open,
  onOpenChange,
  profile,
  loading,
  busyVersionId,
  onUseRoutine,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: PublicAthleteProfile | null;
  loading: boolean;
  busyVersionId: string | null;
  onUseRoutine: (versionId: string) => void;
}) {
  const { language, locale, tr } = useI18n();
  const [selectedLift, setSelectedLift] = useState<LiftType>('back_squat');
  const latest = useMemo(() => latestLiftRecords(profile?.liftRecords ?? []), [profile?.liftRecords]);
  const selectedRecords = profile?.liftRecords.filter((record) => record.lift === selectedLift) ?? [];
  const chartData = selectedRecords.map((record) => ({
    date: new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(new Date(`${record.achievedOn}T12:00:00`)),
    weight: record.weightKg,
  }));
  const chartConfig = { weight: { label: tr('Marca', 'Result'), color: '#7f881e' } };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="public-profile-dialog">
      <DialogHeader className="sr-only"><DialogTitle>{tr('Perfil público de atleta', 'Public athlete profile')}</DialogTitle><DialogDescription>{tr('Datos compartidos por el atleta.', 'Information shared by the athlete.')}</DialogDescription></DialogHeader>
      {loading ? <div className="public-profile-loading"><span /><p>{tr('Cargando perfil…', 'Loading profile…')}</p></div> : profile ? <div className="public-profile-scroll">
        <header className="public-profile-hero">
          <div className="public-profile-avatar">{profile.avatarBase64 ? <img src={profile.avatarBase64} alt="" /> : initials(profile.displayName)}</div>
          <div className="public-profile-identity"><p className="eyebrow">{tr('Perfil de atleta', 'Athlete profile')}</p><h2>{profile.displayName}</h2><span>{language === 'es' ? levelNames[profile.level][0] : levelNames[profile.level][1]} · {tr('Desde', 'Since')} {new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(new Date(profile.joinedAt))}</span></div>
          <div className="public-profile-rank" aria-label={tr('Nivel de experiencia de la cuenta', 'Account experience level')}><Trophy aria-hidden="true" /><span>{tr('Nivel', 'Level')} {profile.accountLevel}</span><strong>{profile.totalXp.toLocaleString(locale)} XP</strong><small>{profile.unlockedAchievementCount} {tr('logros', 'achievements')}</small></div>
        </header>
        {profile.bio && <p className="public-profile-bio">{profile.bio}</p>}

        <section className="public-profile-section">
          <div className="public-profile-section-heading"><div><p className="eyebrow">{tr('Contexto', 'Context')}</p><h3>{tr('Datos de entrenamiento', 'Training data')}</h3></div></div>
          {profile.trainingDataVisible ? <>
            <dl className="public-profile-stats">
              <div><dt>{tr('Entrena', 'Trains')}</dt><dd>{profile.trainingDaysPerWeek ?? '—'} {tr('días/semana', 'days/week')}</dd></div>
              <div><dt>{tr('Altura', 'Height')}</dt><dd>{profile.heightCm ? `${profile.heightCm} cm` : '—'}</dd></div>
              <div><dt>{tr('Peso', 'Weight')}</dt><dd>{profile.weightKg ? `${profile.weightKg} kg` : '—'}</dd></div>
              <div><dt>{tr('Experiencia', 'Experience')}</dt><dd>{profile.weightliftingExperience ? (language === 'es' ? experienceNames[profile.weightliftingExperience][0] : experienceNames[profile.weightliftingExperience][1]) : '—'}</dd></div>
            </dl>
            {profile.goals.length > 0 && <div className="public-profile-goals">{profile.goals.map((goal) => <span key={goal}>{language === 'es' ? focusNames[goal as RoutineFocus]?.[0] ?? goal : focusNames[goal as RoutineFocus]?.[1] ?? goal}</span>)}</div>}
          </> : <PrivateSection text={tr('Este atleta mantiene privados sus datos de entrenamiento.', 'This athlete keeps their training data private.')} />}
        </section>

        <section className="public-profile-section">
          <div className="public-profile-section-heading"><div><p className="eyebrow">{tr('Marcas', 'Results')}</p><h3>{tr('Progresión', 'Progress')}</h3></div></div>
          {profile.progressVisible ? profile.liftRecords.length > 0 ? <>
            <div className="public-profile-lifts">
              {liftDefinitions.map((lift) => <button type="button" className={selectedLift === lift.id ? 'is-active' : ''} onClick={() => setSelectedLift(lift.id)} key={lift.id}><span>{translateKnownText(language, lift.shortLabel)}</span><strong>{latest.get(lift.id)?.weightKg ? `${latest.get(lift.id)?.weightKg} kg` : '—'}</strong></button>)}
            </div>
            <div className="public-profile-chart">
              {chartData.length > 0 ? <ChartContainer config={chartConfig} className="lift-chart" initialDimension={{ width: 680, height: 240 }}><LineChart data={chartData} margin={{ top: 16, right: 16, left: -10, bottom: 2 }} accessibilityLayer><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="date" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} unit=" kg" width={58} /><ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(value) => <strong>{Number(value).toLocaleString(locale)} kg</strong>} />} /><Line dataKey="weight" type="monotone" stroke="var(--color-weight)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-weight)' }} /></LineChart></ChartContainer> : <div className="public-profile-empty"><CalendarDays aria-hidden="true" /><p>{tr('Sin registros para este movimiento.', 'No results for this lift.')}</p></div>}
            </div>
          </> : <div className="public-profile-empty"><Dumbbell aria-hidden="true" /><p>{tr('Todavía no ha registrado marcas.', 'No lift results have been recorded yet.')}</p></div> : <PrivateSection text={tr('La progresión de marcas es privada.', 'Lift progression is private.')} />}
        </section>

        <section className="public-profile-section">
          <div className="public-profile-section-heading"><div><p className="eyebrow">{tr('Planificación', 'Planning')}</p><h3>{tr('Rutinas públicas', 'Public routines')}</h3></div><span>{profile.routines.length}</span></div>
          {profile.routinesVisible ? profile.routines.length > 0 ? <div className="public-profile-routines">{profile.routines.map((routine) => <article key={routine.versionId}><div><span>{language === 'es' ? focusNames[routine.focus][0] : focusNames[routine.focus][1]}</span><span>{language === 'es' ? levelNames[routine.level][0] : levelNames[routine.level][1]}</span></div><h4>{routine.title}</h4><p>{routine.description}</p><footer><small>{routine.weeks} {tr('semanas', 'weeks')} · {routine.daysPerWeek} {tr('días/semana', 'days/week')}</small><span><Heart aria-hidden="true" />{routine.likeCount}<MessageCircle aria-hidden="true" />{routine.questionCount}</span><Button size="sm" disabled={busyVersionId !== null} onClick={() => onUseRoutine(routine.versionId)}><Download aria-hidden="true" />{busyVersionId === routine.versionId ? tr('Añadiendo…', 'Adding…') : tr('Añadir y activar', 'Add and activate')}</Button></footer></article>)}</div> : <div className="public-profile-empty"><Dumbbell aria-hidden="true" /><p>{tr('Este atleta aún no ha publicado rutinas.', 'This athlete has not published routines yet.')}</p></div> : <PrivateSection text={tr('La lista de rutinas es privada.', 'The routine list is private.')} />}
        </section>
      </div> : null}
    </DialogContent>
  </Dialog>;
}

function PrivateSection({ text }: { text: string }) {
  return <div className="public-profile-private"><EyeOff aria-hidden="true" /><p>{text}</p></div>;
}
