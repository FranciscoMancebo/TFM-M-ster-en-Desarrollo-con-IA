import { describe, expect, it } from 'vitest';
import {
  mediaSlotUnlockLevel,
  socialSlotUnlockLevel,
  validMediaUrl,
  validSocialUrl,
  youtubeEmbedUrl,
} from '@/lib/profile-showcase';

describe('profile level rewards', () => {
  it('unlocks media and social slots at the configured levels', () => {
    expect([1, 2, 3].map(mediaSlotUnlockLevel)).toEqual([3, 6, 9]);
    expect([1, 2, 3, 4].map(socialSlotUnlockLevel)).toEqual([2, 4, 6, 8]);
  });

  it('accepts only direct HTTPS images and supported YouTube links', () => {
    expect(validMediaUrl('image', 'https://cdn.example.test/lift.webp')).toBe(true);
    expect(validMediaUrl('image', 'http://cdn.example.test/lift.webp')).toBe(false);
    expect(validMediaUrl('image', 'https://cdn.example.test/file.pdf')).toBe(false);
    expect(validMediaUrl('youtube', 'https://youtu.be/abcDEF_1234')).toBe(true);
    expect(validMediaUrl('youtube', 'https://example.test/video')).toBe(false);
  });

  it('builds privacy-enhanced YouTube embeds', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/watch?v=abcDEF_1234'))
      .toBe('https://www.youtube-nocookie.com/embed/abcDEF_1234');
    expect(youtubeEmbedUrl('javascript:alert(1)')).toBeNull();
  });

  it('matches each social link to its declared network', () => {
    expect(validSocialUrl('instagram', 'https://instagram.com/haltero')).toBe(true);
    expect(validSocialUrl('instagram', 'https://x.com/haltero')).toBe(false);
    expect(validSocialUrl('x', 'https://twitter.com/haltero')).toBe(true);
    expect(validSocialUrl('website', 'https://club.example.test/atleta')).toBe(true);
    expect(validSocialUrl('website', 'http://club.example.test/atleta')).toBe(false);
  });
});
