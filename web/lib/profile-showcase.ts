import type { ProfileMediaType, SocialNetwork } from '@/lib/workout/types';

export const MEDIA_SLOT_LEVELS = [3, 6, 9] as const;
export const SOCIAL_SLOT_LEVELS = [2, 4, 6, 8] as const;

export const socialNetworkLabels: Record<SocialNetwork, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  x: 'X',
  website: 'Web',
};

export function mediaSlotUnlockLevel(slot: number) {
  return MEDIA_SLOT_LEVELS[slot - 1] ?? Number.POSITIVE_INFINITY;
}

export function socialSlotUnlockLevel(slot: number) {
  return SOCIAL_SLOT_LEVELS[slot - 1] ?? Number.POSITIVE_INFINITY;
}

export function validMediaUrl(type: ProfileMediaType, value: string) {
  const url = safeHttpsUrl(value);
  if (!url) return false;
  if (type === 'image') return /\.(?:jpe?g|png|webp)$/i.test(url.pathname);
  return youtubeVideoId(url) !== null;
}

export function validSocialUrl(network: SocialNetwork, value: string) {
  const url = safeHttpsUrl(value);
  if (!url) return false;
  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  if (network === 'website') return true;
  if (network === 'instagram') return hostname === 'instagram.com';
  if (network === 'youtube') return hostname === 'youtube.com' || hostname === 'youtu.be';
  if (network === 'tiktok') return hostname === 'tiktok.com';
  return hostname === 'x.com' || hostname === 'twitter.com';
}

export function youtubeEmbedUrl(value: string) {
  const url = safeHttpsUrl(value);
  const id = url ? youtubeVideoId(url) : null;
  return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
}

function safeHttpsUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function youtubeVideoId(url: URL) {
  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  if (hostname === 'youtu.be') return cleanVideoId(url.pathname.split('/').filter(Boolean)[0]);
  if (hostname !== 'youtube.com') return null;
  if (url.pathname === '/watch') return cleanVideoId(url.searchParams.get('v'));
  const [kind, id] = url.pathname.split('/').filter(Boolean);
  return kind === 'shorts' || kind === 'embed' ? cleanVideoId(id) : null;
}

function cleanVideoId(value: string | null | undefined) {
  return value && /^[a-zA-Z0-9_-]{6,20}$/.test(value) ? value : null;
}
