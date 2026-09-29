import { describe, expect, it } from 'vitest';
import { applicableRfehAgeGroups, assessRfehQualification, federationAge } from '@/lib/workout/competition-standards';

describe('RFEH competition references', () => {
  it('calculates federation age from the natural year', () => {
    expect(federationAge(2009, 2026)).toBe(17);
    expect(federationAge(1990, 2026)).toBe(36);
  });

  it('returns every championship age group that applies', () => {
    expect(applicableRfehAgeGroups(2011, 2026).map((group) => group.id))
      .toEqual(['sub15', 'sub17', 'junior', 'senior']);
    expect(applicableRfehAgeGroups(2014, 2026)).toEqual([]);
  });

  it('uses the current female senior weight class and 64 elite-point minimum', () => {
    expect(assessRfehQualification({
      birthYear: 1996,
      sex: 'female',
      bodyWeightKg: 65,
      snatchKg: 75,
      cleanAndJerkKg: 90,
      season: 2026,
    })).toEqual([expect.objectContaining({
      ageGroup: 'senior',
      weightCategory: '69 kg',
      elitePointsRequired: 64,
      minimumTotalKg: 165,
      currentTotalKg: 165,
      differenceKg: 0,
      meetsReference: true,
    })]);
  });

  it('reports the missing kilograms for a male senior reference', () => {
    expect(assessRfehQualification({
      birthYear: 2003,
      sex: 'male',
      bodyWeightKg: 89,
      snatchKg: 120,
      cleanAndJerkKg: 150,
      season: 2026,
    })).toEqual([expect.objectContaining({
      ageGroup: 'senior',
      weightCategory: '95 kg',
      elitePointsRequired: 68,
      minimumTotalKg: 272,
      differenceKg: -2,
      meetsReference: false,
    })]);
  });

  it('selects the open weight category above the last class', () => {
    const result = assessRfehQualification({
      birthYear: 1990,
      sex: 'male',
      bodyWeightKg: 121,
      snatchKg: 140,
      cleanAndJerkKg: 170,
      season: 2026,
    })[0];
    expect(result).toMatchObject({ weightCategory: '+110 kg', minimumTotalKg: 309, meetsReference: true });
  });

  it('calculates a separate minimum for each overlapping youth category', () => {
    const results = assessRfehQualification({
      birthYear: 2011,
      sex: 'female',
      bodyWeightKg: 50,
      snatchKg: 50,
      cleanAndJerkKg: 65,
      season: 2026,
    });
    expect(results.map((result) => [result.ageGroup, result.weightCategory, result.minimumTotalKg]))
      .toEqual([
        ['sub15', '53 kg', 82],
        ['sub17', '53 kg', 104],
        ['junior', '53 kg', 121],
        ['senior', '53 kg', 138],
      ]);
  });

  it.each([
    ['male', 2011, 90, 'sub15', '+85 kg', 161],
    ['male', 2009, 100, 'sub17', '+95 kg', 204],
    ['female', 2011, 72, 'sub15', '+69 kg', 112],
    ['female', 2009, 80, 'sub17', '+77 kg', 161],
  ] as const)('applies the official open-category exception for %s %s', (sex, birthYear, bodyWeightKg, ageGroup, category, minimum) => {
    const result = assessRfehQualification({
      birthYear,
      sex,
      bodyWeightKg,
      snatchKg: 1,
      cleanAndJerkKg: 1,
      season: 2026,
    }).find((item) => item.ageGroup === ageGroup);
    expect(result).toMatchObject({ weightCategory: category, minimumTotalKg: minimum });
  });
});
