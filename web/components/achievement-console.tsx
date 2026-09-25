'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, BookOpen, CalendarDays, Flame, Heart, Library, Medal, MessageCircle, Play, Star, TrendingUp, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useI18n } from '@/lib/i18n';
import { workoutRepository } from '@/lib/workout/repository';
import type { GamificationProgress } from '@/lib/workout/types';

const achievementIcons: Record<string, LucideIcon> = {
  play: Play,
  flame: Flame,
  calendar: CalendarDays,
  chart: BarChart3,
  trending: TrendingUp,
  medal: Medal,
  book: BookOpen,
  library: Library,
  heart: Heart,
  star: Star,
  message: MessageCircle,
};

export function AchievementConsole({ onError }: { onError: (message: string) => void }) {
  const { language, locale, tr } = useI18n();
  const [progress, setProgress] = useState<GamificationProgress | null>(null);
  const unlocked = useMemo(() => progress?.achievements.filter((achievement) => achievement.unlockedAt) ?? [], [progress]);
  const locked = useMemo(() => progress?.achievements.filter((achievement) => !achievement.unlockedAt) ?? [], [progress]);

  useEffect(() => {
    let cancelled = false;
    void workoutRepository.loadGamification().then((loaded) => {
      if (!cancelled) setProgress(loaded);
    }).catch((error) => {
      if (!cancelled) onError(error instanceof Error ? error.message : language === 'es' ? 'No se pudieron cargar los logros.' : 'Achievements could not be loaded.');
    });
    return () => { cancelled = true; };
  }, [language, onError]);

  if (!progress) return <div className="achievement-loading"><Trophy aria-hidden="true" /><p>{tr('Cargando tu progreso…', 'Loading your progress…')}</p></div>;

  const levelRange = Math.max(1, progress.nextLevelXp - progress.currentLevelXp);
  const levelProgress = Math.max(0, Math.min(100, ((progress.totalXp - progress.currentLevelXp) / levelRange) * 100));

  return <div className="page-wrap achievements-page">
    <header className="top-bar"><div className="mobile-brand"><div className="brand-lockup"><span className="brand-mark" aria-hidden="true">H</span><span>HALTERO</span></div></div><div className="date-block"><span>{tr('Perfil de jugador', 'Player profile')}</span><strong>{tr('Progreso y recompensas', 'Progress and rewards')}</strong></div><Trophy aria-hidden="true" /></header>

    <section className="achievement-hero">
      <div className="achievement-level"><span>{tr('NIVEL', 'LEVEL')}</span><strong>{progress.level.toString().padStart(2, '0')}</strong></div>
      <div className="achievement-level-progress"><p className="eyebrow">{tr('Experiencia de atleta', 'Athlete experience')}</p><h1>{progress.totalXp.toLocaleString(locale)} XP</h1><Progress value={levelProgress} /><div><span>{progress.totalXp - progress.currentLevelXp} XP</span><span>{progress.nextLevelXp - progress.totalXp} XP {tr('para el siguiente nivel', 'to next level')}</span></div></div>
      <div className="achievement-count"><Trophy aria-hidden="true" /><strong>{progress.unlockedCount}/{progress.achievements.length}</strong><span>{tr('logros desbloqueados', 'achievements unlocked')}</span></div>
    </section>

    <section className="achievement-section">
      <div className="section-heading"><div><p className="eyebrow">{tr('Colección', 'Collection')}</p><h2>{tr('Logros desbloqueados', 'Unlocked achievements')}</h2></div><span>{unlocked.length}</span></div>
      {unlocked.length ? <div className="achievement-grid">{unlocked.map((achievement) => <AchievementCard achievement={achievement} unlocked language={language} locale={locale} key={achievement.code} />)}</div> : <div className="achievement-empty"><Trophy aria-hidden="true" /><h3>{tr('Tu primera insignia está cerca', 'Your first badge is close')}</h3><p>{tr('Registra una marca, completa una sesión o publica una rutina.', 'Record a result, complete a session or publish a routine.')}</p></div>}
    </section>

    <section className="achievement-section">
      <div className="section-heading"><div><p className="eyebrow">{tr('Siguientes objetivos', 'Next objectives')}</p><h2>{tr('Logros por desbloquear', 'Locked achievements')}</h2></div></div>
      <div className="achievement-grid">{locked.map((achievement) => <AchievementCard achievement={achievement} unlocked={false} language={language} locale={locale} key={achievement.code} />)}</div>
    </section>

    <section className="xp-log">
      <div className="section-heading"><div><p className="eyebrow">{tr('Registro del sistema', 'System log')}</p><h2>{tr('XP reciente', 'Recent XP')}</h2></div></div>
      {progress.recentEvents.length ? <ol>{progress.recentEvents.map((event) => <li key={event.id}><span>+{event.xp} XP</span><strong>{eventLabel(event.type, tr)}</strong><time>{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(event.createdAt))}</time></li>)}</ol> : <p>{tr('Todavía no hay movimientos de experiencia.', 'There are no experience events yet.')}</p>}
    </section>
  </div>;
}

function AchievementCard({ achievement, unlocked, language, locale }: { achievement: GamificationProgress['achievements'][number]; unlocked: boolean; language: 'es' | 'en'; locale: string }) {
  const Icon = achievementIcons[achievement.icon] ?? Trophy;
  const completion = Math.min(100, achievement.progressValue / achievement.targetValue * 100);
  return <article className={unlocked ? 'achievement-card is-unlocked' : 'achievement-card'}>
    <div className="achievement-icon"><Icon aria-hidden="true" /></div>
    <div className="achievement-copy"><span>{unlocked ? (language === 'es' ? 'DESBLOQUEADO' : 'UNLOCKED') : `${achievement.progressValue}/${achievement.targetValue}`}</span><h3>{language === 'es' ? achievement.titleEs : achievement.titleEn}</h3><p>{language === 'es' ? achievement.descriptionEs : achievement.descriptionEn}</p></div>
    <strong className="achievement-reward">+{achievement.xpReward} XP</strong>
    {!unlocked && <Progress value={completion} />}
    {unlocked && achievement.unlockedAt && <time>{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(achievement.unlockedAt))}</time>}
  </article>;
}

function eventLabel(type: string, tr: (es: string, en: string) => string) {
  const labels: Record<string, [string, string]> = {
    workout_completed: ['Entrenamiento completado', 'Workout completed'],
    lift_recorded: ['Marca registrada', 'Lift result recorded'],
    routine_published: ['Rutina publicada', 'Routine published'],
    like_received: ['Like recibido', 'Like received'],
    question_received: ['Pregunta recibida', 'Question received'],
    achievement: ['Logro desbloqueado', 'Achievement unlocked'],
  };
  const label = labels[type] ?? ['Experiencia obtenida', 'Experience earned'];
  return tr(label[0], label[1]);
}
