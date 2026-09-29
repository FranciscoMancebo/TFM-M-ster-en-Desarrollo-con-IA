'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import NextImage from 'next/image';
import { AtSign, CalendarDays, Download, Dumbbell, ExternalLink, EyeOff, Flame, Globe2, Heart, Link2, Medal, MessageCircle, Music2, Play, Sparkles, Star, TrendingUp, Trophy, Zap } from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { translateKnownText, useI18n } from '@/lib/i18n';
import { liftDefinitions, latestLiftRecords } from '@/lib/workout/lifts';
import { socialNetworkLabels, youtubeEmbedUrl } from '@/lib/profile-showcase';
import type { AthleteLevel, EquippedProfileReward, LiftType, PublicAthleteProfile, RoutineFocus, WeightliftingExperience } from '@/lib/workout/types';

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
  const equipped = (type: EquippedProfileReward['rewardType']) => profile?.profileRewards.find((reward) => reward.rewardType === type) ?? null;
  const colorReward = equipped('color');
  const frameReward = equipped('frame');
  const titleReward = equipped('title');
  const badgeReward = equipped('badge');
  const iconReward = equipped('icon');
  const rewardStyle = colorReward ? { '--profile-reward-color': colorReward.visualValue } as CSSProperties : undefined;

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="public-profile-dialog">
      <DialogHeader className="sr-only"><DialogTitle>{tr('Perfil público de atleta', 'Public athlete profile')}</DialogTitle><DialogDescription>{tr('Datos compartidos por el atleta.', 'Information shared by the athlete.')}</DialogDescription></DialogHeader>
      {loading ? <div className="public-profile-loading"><span /><p>{tr('Cargando perfil…', 'Loading profile…')}</p></div> : profile ? <div className="public-profile-scroll">
        <header className={`public-profile-hero${colorReward ? ' has-reward-color' : ''}`} style={rewardStyle}>
          <div className={`public-profile-avatar${frameReward ? ` reward-frame-${frameReward.visualValue}` : ''}`}>{profile.avatarBase64 ? <NextImage src={profile.avatarBase64} alt="" width={152} height={152} unoptimized /> : initials(profile.displayName)}</div>
          <div className="public-profile-identity"><p className="eyebrow">{tr('Perfil de atleta', 'Athlete profile')}</p><h2>{profile.displayName}{iconReward && <RewardGlyph reward={iconReward} />}</h2>{titleReward && <strong className="public-profile-equipped-title">{language === 'es' ? titleReward.titleEs : titleReward.titleEn}</strong>}<span>{language === 'es' ? levelNames[profile.level][0] : levelNames[profile.level][1]} · {tr('Desde', 'Since')} {new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(new Date(profile.joinedAt))}</span></div>
          <div className="public-profile-rank" aria-label={tr('Nivel de experiencia de la cuenta', 'Account experience level')}><Trophy aria-hidden="true" /><span>{tr('Nivel', 'Level')} {profile.accountLevel}</span><strong>{profile.totalXp.toLocaleString(locale)} XP</strong><small>{profile.unlockedAchievementCount} {tr('logros', 'achievements')}</small>{badgeReward && <b><Medal aria-hidden="true" />{language === 'es' ? badgeReward.titleEs : badgeReward.titleEn}</b>}</div>
        </header>
        {profile.bio && <p className="public-profile-bio">{profile.bio}</p>}
        {profile.socialLinksVisible && profile.socialLinks.length > 0 && <nav className="public-profile-social-links" aria-label={tr('Redes sociales del atleta', "Athlete's social links")}>{profile.socialLinks.map((link) => <a href={link.url} target="_blank" rel="noopener noreferrer nofollow" key={link.id}>{link.network === 'instagram' ? <AtSign aria-hidden="true" /> : link.network === 'youtube' ? <Play aria-hidden="true" /> : link.network === 'tiktok' ? <Music2 aria-hidden="true" /> : link.network === 'website' ? <Globe2 aria-hidden="true" /> : <span aria-hidden="true">X</span>}<span>{socialNetworkLabels[link.network]}</span><ExternalLink aria-hidden="true" /></a>)}</nav>}

        <section className="public-profile-section">
          <div className="public-profile-section-heading"><div><p className="eyebrow">{tr('Escaparate', 'Showcase')}</p><h3>{tr('Galería multimedia', 'Media gallery')}</h3></div><span>{profile.mediaItems.length}/3</span></div>
          {profile.mediaVisible ? profile.mediaItems.length > 0 ? <div className="public-profile-media-grid">{profile.mediaItems.map((item) => {
            const embedUrl = item.mediaType === 'youtube' ? youtubeEmbedUrl(item.url) : null;
            return <article key={item.id}>
              <div className="public-profile-media-frame">{item.mediaType === 'image' ? <NextImage src={item.url} alt={item.title} width={640} height={400} unoptimized referrerPolicy="no-referrer" /> : embedUrl ? <iframe src={embedUrl} title={item.title} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <div><Link2 aria-hidden="true" /></div>}</div>
              <div><h4>{item.title}</h4>{item.description && <p>{item.description}</p>}</div>
            </article>;
          })}</div> : <div className="public-profile-empty"><Link2 aria-hidden="true" /><p>{tr('Todavía no ha añadido elementos multimedia.', 'No media items have been added yet.')}</p></div> : <PrivateSection text={tr('La galería multimedia es privada.', 'The media gallery is private.')} />}
        </section>

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

function RewardGlyph({ reward }: { reward: EquippedProfileReward }) {
  const Icon = reward.visualValue === 'flame' ? Flame
    : reward.visualValue === 'star' ? Star
      : reward.visualValue === 'medal' ? Medal
        : reward.visualValue === 'trophy' ? Trophy
          : reward.visualValue === 'trending' ? TrendingUp
            : reward.visualValue === 'barbell' ? Dumbbell
              : reward.visualValue === 'bolt' ? Zap
                : Sparkles;
  return <Icon className="public-profile-equipped-icon" aria-label={reward.titleEs} />;
}

function PrivateSection({ text }: { text: string }) {
  return <div className="public-profile-private"><EyeOff aria-hidden="true" /><p>{text}</p></div>;
}
