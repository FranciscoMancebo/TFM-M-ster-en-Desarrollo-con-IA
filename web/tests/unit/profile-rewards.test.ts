import { describe, expect, it } from 'vitest';
import { equippedReward, isMajorRewardLevel, isPrestigeRewardLevel, rewardsByCategory } from '@/lib/gamification/rewards';
import type { ProfileReward } from '@/lib/workout/types';

const reward = (code: string, category: ProfileReward['category'], rewardType: ProfileReward['rewardType'], equipped = false): ProfileReward => ({
  code,
  category,
  rewardType,
  titleEs: code,
  titleEn: code,
  descriptionEs: '',
  descriptionEn: '',
  visualValue: code,
  requiredLevel: 2,
  achievementCode: null,
  unlocked: true,
  equipped,
});

describe('profile cosmetic rewards', () => {
  it('marks each fifth level as major and each tenth as prestige', () => {
    expect([5, 10, 15, 20].map(isMajorRewardLevel)).toEqual([true, true, true, true]);
    expect([5, 10, 15, 20].map(isPrestigeRewardLevel)).toEqual([false, true, false, true]);
  });

  it('groups category rewards without mixing level rewards', () => {
    const grouped = rewardsByCategory([
      reward('level', 'level', 'color'),
      reward('volume', 'volume', 'badge'),
      reward('technique', 'technique', 'title'),
    ]);
    expect(grouped.get('level')?.map((item) => item.code)).toEqual(['level']);
    expect(grouped.get('volume')?.map((item) => item.code)).toEqual(['volume']);
    expect(grouped.get('technique')?.map((item) => item.code)).toEqual(['technique']);
  });

  it('returns the equipped reward for a cosmetic slot', () => {
    const rewards = [reward('first', 'level', 'color'), reward('second', 'level', 'color', true)];
    expect(equippedReward(rewards, 'color')?.code).toBe('second');
    expect(equippedReward(rewards, 'badge')).toBeNull();
  });
});
