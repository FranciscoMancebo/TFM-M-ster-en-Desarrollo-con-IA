'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Award, Sparkles, Trophy, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { workoutRepository } from '@/lib/workout/repository';
import { isPrestigeRewardLevel } from '@/lib/gamification/rewards';
import type { Achievement, GamificationProgress } from '@/lib/workout/types';

export const GAMIFICATION_CHECK_EVENT = 'haltero:gamification-check';
export const GAMIFICATION_UPDATED_EVENT = 'haltero:gamification-updated';

type GamificationSnapshot = {
  level: number;
  unlockedCodes: string[];
};

export type Celebration =
  | { key: string; kind: 'achievement'; achievement: Achievement }
  | { key: string; kind: 'level'; level: number; totalXp: number; prestige: boolean };

export function requestGamificationCheck() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(GAMIFICATION_CHECK_EVENT));
  window.setTimeout(() => window.dispatchEvent(new Event(GAMIFICATION_CHECK_EVENT)), 600);
}

export function snapshotGamification(progress: GamificationProgress): GamificationSnapshot {
  return {
    level: progress.level,
    unlockedCodes: progress.achievements
      .filter((achievement) => achievement.unlockedAt !== null)
      .map((achievement) => achievement.code),
  };
}

export function celebrationsSince(
  previous: GamificationSnapshot,
  current: GamificationProgress,
): Celebration[] {
  const knownAchievements = new Set(previous.unlockedCodes);
  const achievements: Celebration[] = current.achievements
    .filter((achievement) => achievement.unlockedAt !== null && !knownAchievements.has(achievement.code))
    .map((achievement) => ({
      key: `achievement:${achievement.code}`,
      kind: 'achievement',
      achievement,
    }));

  if (current.level > previous.level) {
    achievements.push({
      key: `level:${current.level}`,
      kind: 'level',
      level: current.level,
      totalXp: current.totalXp,
      prestige: isPrestigeRewardLevel(current.level),
    });
  }
  return achievements;
}

function storedSnapshot(userId: string): GamificationSnapshot | null {
  try {
    const raw = window.localStorage.getItem(`haltero-gamification:${userId}`);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<GamificationSnapshot>;
    if (typeof value.level !== 'number' || !Array.isArray(value.unlockedCodes)) return null;
    return {
      level: value.level,
      unlockedCodes: value.unlockedCodes.filter((code): code is string => typeof code === 'string'),
    };
  } catch {
    return null;
  }
}

function saveSnapshot(userId: string, snapshot: GamificationSnapshot) {
  window.localStorage.setItem(`haltero-gamification:${userId}`, JSON.stringify(snapshot));
}

export function GamificationCelebration({ userId }: { userId: string }) {
  const { language, locale, tr } = useI18n();
  const previousRef = useRef<GamificationSnapshot | null>(null);
  const checkingRef = useRef(false);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const active = celebrations[0] ?? null;

  const checkProgress = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      const progress = await workoutRepository.loadGamification();
      window.dispatchEvent(new CustomEvent<GamificationProgress>(GAMIFICATION_UPDATED_EVENT, { detail: progress }));
      const currentSnapshot = snapshotGamification(progress);
      const previous = previousRef.current ?? storedSnapshot(userId);
      previousRef.current = currentSnapshot;
      saveSnapshot(userId, currentSnapshot);
      if (!previous) return;

      const nextCelebrations = celebrationsSince(previous, progress);
      if (nextCelebrations.length > 0) {
        setCelebrations((queued) => {
          const existing = new Set(queued.map((item) => item.key));
          return [...queued, ...nextCelebrations.filter((item) => !existing.has(item.key))];
        });
      }
    } catch {
      // A transient refresh failure must not interrupt training or show a false alert.
    } finally {
      checkingRef.current = false;
    }
  }, [userId]);

  useEffect(() => {
    const initialCheck = window.setTimeout(() => void checkProgress(), 0);
    const poll = window.setInterval(() => void checkProgress(), 20_000);
    const onRequestedCheck = () => void checkProgress();
    window.addEventListener(GAMIFICATION_CHECK_EVENT, onRequestedCheck);
    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(poll);
      window.removeEventListener(GAMIFICATION_CHECK_EVENT, onRequestedCheck);
    };
  }, [checkProgress]);

  useEffect(() => {
    if (!active) return;
    const dismissTimer = window.setTimeout(() => {
      setCelebrations((queued) => queued.slice(1));
    }, active.kind === 'level' ? 6500 : 5500);
    return () => window.clearTimeout(dismissTimer);
  }, [active]);

  if (!active) return null;

  const isAchievement = active.kind === 'achievement';
  const isPrestige = active.kind === 'level' && active.prestige;
  const title = isAchievement
    ? language === 'es' ? active.achievement.titleEs : active.achievement.titleEn
    : isPrestige ? tr(`¡Prestigio ${active.level / 10}!`, `Prestige ${active.level / 10}!`) : tr(`¡Nivel ${active.level}!`, `Level ${active.level}!`);
  const description = isAchievement
    ? language === 'es' ? active.achievement.descriptionEs : active.achievement.descriptionEn
    : tr(
        isPrestige ? `Has alcanzado el nivel ${active.level} y una nueva insignia de prestigio.` : `Has alcanzado ${active.totalXp.toLocaleString(locale)} XP. Tu constancia sigue creciendo.`,
        isPrestige ? `You reached level ${active.level} and earned a new prestige badge.` : `You have reached ${active.totalXp.toLocaleString(locale)} XP. Your consistency keeps growing.`,
      );

  return (
    <aside className={`gamification-celebration is-${active.kind}${isPrestige ? ' is-prestige' : ''}`} role="alert" aria-live="assertive">
      <div className="celebration-particles" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => <i key={index} />)}
      </div>
      <button
        type="button"
        className="celebration-close"
        aria-label={tr('Cerrar celebración', 'Close celebration')}
        onClick={() => setCelebrations((queued) => queued.slice(1))}
      >
        <X aria-hidden="true" />
      </button>
      <div className="celebration-icon" aria-hidden="true">
        {isAchievement ? <Trophy /> : <ArrowUp />}
      </div>
      <div className="celebration-copy">
        <span><Sparkles aria-hidden="true" />{isAchievement ? tr('Logro desbloqueado', 'Achievement unlocked') : isPrestige ? tr('Hito de prestigio', 'Prestige milestone') : tr('Subida de nivel', 'Level up')}</span>
        <strong>{title}</strong>
        <p>{description}</p>
        {isAchievement && <small><Award aria-hidden="true" />+{active.achievement.xpReward} XP</small>}
      </div>
    </aside>
  );
}
