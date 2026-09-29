import type { ProfileReward } from '@/lib/workout/types';

export function isMajorRewardLevel(level: number) {
  return level > 0 && level % 5 === 0;
}

export function isPrestigeRewardLevel(level: number) {
  return level > 0 && level % 10 === 0;
}

export function rewardsByCategory(rewards: ProfileReward[]) {
  return Map.groupBy(rewards, (reward) => reward.category);
}

export function equippedReward(rewards: ProfileReward[], type: ProfileReward['rewardType']) {
  return rewards.find((reward) => reward.rewardType === type && reward.equipped) ?? null;
}
