import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../../lib/accessibility/contrast';

describe('accessible colour pairs', () => {
  it.each([
    ['primary text on paper', '#171916', '#f3f1eb'],
    ['muted text on paper', '#646960', '#f3f1eb'],
    ['link text on paper', '#525b12', '#f3f1eb'],
    ['signal on forest', '#f2ff38', '#1d241b'],
    ['danger text on white', '#ad3528', '#ffffff'],
  ])('%s meets WCAG AA for normal text', (_name, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
