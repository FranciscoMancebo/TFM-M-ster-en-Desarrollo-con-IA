import { describe, expect, it } from 'vitest';
import {
  addRestTimerSeconds,
  completeRestTimer,
  createRestTimer,
  parseRestTimer,
  pauseRestTimer,
  resolveRestDuration,
  restartRestTimer,
  restSecondsRemaining,
  resumeRestTimer,
  serializeRestTimer,
} from '../../lib/workout/rest-timer';

describe('rest timer', () => {
  it('uses the prescribed rest and falls back only when it is absent or zero', () => {
    expect(resolveRestDuration(180, 120)).toBe(180);
    expect(resolveRestDuration(0, 120)).toBe(120);
    expect(resolveRestDuration(null, 90)).toBe(90);
  });

  it('counts down from an absolute deadline', () => {
    const timer = createRestTimer('session-1', 'Sentadilla', 2, 120, 1_000, () => 'timer-1');
    expect(restSecondsRemaining(timer, 1_000)).toBe(120);
    expect(restSecondsRemaining(timer, 31_500)).toBe(90);
    expect(restSecondsRemaining(timer, 121_000)).toBe(0);
  });

  it('pauses and resumes without losing the remaining time', () => {
    const timer = createRestTimer('session-1', 'Arrancada', 1, 90, 0, () => 'timer-1');
    const paused = pauseRestTimer(timer, 20_000);
    expect(paused.endsAt).toBeNull();
    expect(paused.remainingSeconds).toBe(70);
    const resumed = resumeRestTimer(paused, 100_000);
    expect(resumed.endsAt).toBe(170_000);
    expect(restSecondsRemaining(resumed, 130_000)).toBe(40);
  });

  it('adds time, restarts and completes the timer', () => {
    const timer = createRestTimer('session-1', 'Dos tiempos', 3, 60, 0, () => 'timer-1');
    const extended = addRestTimerSeconds(timer, 30, 20_000);
    expect(restSecondsRemaining(extended, 20_000)).toBe(70);
    expect(extended.durationSeconds).toBe(70);
    const restarted = restartRestTimer(extended, 50_000);
    expect(restSecondsRemaining(restarted, 50_000)).toBe(70);
    expect(restSecondsRemaining(completeRestTimer(restarted), 50_000)).toBe(0);
  });

  it('restores only a valid timer for the active session', () => {
    const timer = createRestTimer('session-1', 'Sentadilla frontal', 4, 150, 0, () => 'timer-1');
    expect(parseRestTimer(serializeRestTimer(timer), 'session-1')).toEqual(timer);
    expect(parseRestTimer(serializeRestTimer(timer), 'session-2')).toBeNull();
    expect(parseRestTimer('{invalid', 'session-1')).toBeNull();
  });
});
