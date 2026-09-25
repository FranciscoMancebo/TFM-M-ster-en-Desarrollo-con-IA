import { describe, expect, it } from 'vitest';
import { celebrationsSince, snapshotGamification } from '../../components/gamification-celebration';
import type { Achievement, GamificationProgress } from '../../lib/workout/types';

function achievement(code: string, unlockedAt: string | null): Achievement {
  return {
    code,
    titleEs: code,
    titleEn: code,
    descriptionEs: '',
    descriptionEn: '',
    icon: 'trophy',
    xpReward: 100,
    targetValue: 1,
    progressValue: unlockedAt ? 1 : 0,
    unlockedAt,
  };
}

function progress(level: number, achievements: Achievement[]): GamificationProgress {
  return {
    totalXp: level * 300,
    level,
    currentLevelXp: 0,
    nextLevelXp: 1000,
    unlockedCount: achievements.filter((item) => item.unlockedAt).length,
    achievements,
    recentEvents: [],
  };
}

describe('gamification celebrations', () => {
  it('returns only achievements unlocked since the previous snapshot', () => {
    const previous = snapshotGamification(progress(1, [
      achievement('first_mark', '2026-09-20T10:00:00Z'),
      achievement('ten_marks', null),
    ]));
    const events = celebrationsSince(previous, progress(1, [
      achievement('first_mark', '2026-09-20T10:00:00Z'),
      achievement('ten_marks', '2026-09-25T10:00:00Z'),
    ]));

    expect(events.map((event) => event.key)).toEqual(['achievement:ten_marks']);
  });

  it('adds one level-up event when the account level increases', () => {
    const events = celebrationsSince(
      { level: 2, unlockedCodes: [] },
      progress(4, []),
    );

    expect(events).toEqual([expect.objectContaining({ kind: 'level', level: 4 })]);
  });

  it('does not repeat already known achievements or levels', () => {
    const current = progress(3, [achievement('first_workout', '2026-09-25T10:00:00Z')]);
    expect(celebrationsSince(snapshotGamification(current), current)).toEqual([]);
  });
});
