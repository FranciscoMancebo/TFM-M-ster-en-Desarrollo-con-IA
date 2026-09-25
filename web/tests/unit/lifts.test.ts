import { describe, expect, it } from 'vitest';
import { determineAthleteLevel, latestLiftRecords } from '../../lib/workout/lifts';
import type { LiftRecord } from '../../lib/workout/types';

function record(
  lift: LiftRecord['lift'],
  weightKg: number,
  achievedOn = '2026-09-25',
): LiftRecord {
  return {
    id: `${lift}-${weightKg}-${achievedOn}`,
    lift,
    weightKg,
    achievedOn,
    source: 'manual',
  };
}

describe('latestLiftRecords', () => {
  it('keeps the newest result for each lift even when records are unordered', () => {
    const latest = latestLiftRecords([
      record('back_squat', 110, '2026-09-01'),
      record('snatch', 60, '2026-09-20'),
      record('back_squat', 120, '2026-09-22'),
      record('back_squat', 115, '2026-09-15'),
    ]);

    expect(latest.get('back_squat')?.weightKg).toBe(120);
    expect(latest.get('snatch')?.weightKg).toBe(60);
  });
});

describe('determineAthleteLevel', () => {
  it('starts safely when experience has not been supplied', () => {
    expect(determineAthleteLevel(80, null, [record('back_squat', 180)])).toBe('starter');
  });

  it('never promotes an athlete beyond the cap for their experience', () => {
    const strongRecords = [
      record('back_squat', 200),
      record('front_squat', 170),
      record('snatch', 100),
      record('clean_and_jerk', 125),
    ];

    expect(determineAthleteLevel(80, 'never', strongRecords)).toBe('starter');
    expect(determineAthleteLevel(80, 'under_6_months', strongRecords)).toBe('beginner');
    expect(determineAthleteLevel(80, 'six_to_twenty_four_months', strongRecords)).toBe('intermediate');
  });

  it('combines bodyweight ratios and consolidated experience', () => {
    const records = [
      record('back_squat', 160),
      record('front_squat', 136),
      record('snatch', 80),
      record('clean_and_jerk', 100),
    ];

    expect(determineAthleteLevel(80, 'over_two_years', records)).toBe('advanced');
  });

  it('uses experience when bodyweight or reference results are unavailable', () => {
    expect(determineAthleteLevel(null, 'six_to_twenty_four_months', [])).toBe('intermediate');
    expect(determineAthleteLevel(80, 'under_6_months', [])).toBe('beginner');
  });
});
