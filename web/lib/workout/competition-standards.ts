import type { CompetitionSex } from './types';

export const RFEH_STANDARD_YEAR = 2026;
export const RFEH_RULES_URL = 'https://www.fedehalter.org/wp-content/uploads/2026/09/Bases-reglamentarias-4.2026.pdf';
export const RFEH_STANDARDS_URL = 'https://www.fedehalter.org/normativas/';

export type RfehAgeGroup = 'sub15' | 'sub17' | 'junior' | 'senior';

type CategoryDefinition = {
  limitKg: number | null;
  label: string;
  elite100TotalKg: number;
};

type AgeGroupDefinition = {
  id: RfehAgeGroup;
  minAge: number;
  maxAge: number | null;
  elitePoints: Record<CompetitionSex, number>;
  categories: Record<CompetitionSex, CategoryDefinition[]>;
};

export type RfehQualification = {
  ageGroup: RfehAgeGroup;
  age: number;
  sex: CompetitionSex;
  weightCategory: string;
  elitePointsRequired: number;
  minimumTotalKg: number;
  currentTotalKg: number;
  differenceKg: number;
  meetsReference: boolean;
};

const femaleReferences = new Map<number | null, number>([
  [41, 183], [45, 191], [49, 203], [53, 215], [57, 227], [61, 237],
  [69, 257], [77, 274], [86, 293], [null, 320],
]);

const maleReferences = new Map<number | null, number>([
  [51, 283], [55, 293], [60, 308], [65, 324], [70, 339], [75, 354],
  [85, 378], [95, 399], [110, 426], [null, 453],
]);

function categories(limits: number[], sex: CompetitionSex): CategoryDefinition[] {
  const references = sex === 'female' ? femaleReferences : maleReferences;
  const finalLimit = limits.at(-1)!;
  return [
    ...limits.map((limitKg) => ({
      limitKg,
      label: `${limitKg} kg`,
      elite100TotalKg: references.get(limitKg)!,
    })),
    {
      limitKg: null,
      label: `+${finalLimit} kg`,
      elite100TotalKg: references.get(null)!,
    },
  ];
}

const ageGroups: AgeGroupDefinition[] = [
  {
    id: 'sub15', minAge: 13, maxAge: 15, elitePoints: { male: 38, female: 38 },
    categories: {
      male: categories([51, 55, 60, 65, 70, 75, 85], 'male'),
      female: categories([41, 45, 49, 53, 57, 61, 69], 'female'),
    },
  },
  {
    id: 'sub17', minAge: 13, maxAge: 17, elitePoints: { male: 48, female: 48 },
    categories: {
      male: categories([55, 60, 65, 70, 75, 85, 95], 'male'),
      female: categories([45, 49, 53, 57, 61, 69, 77], 'female'),
    },
  },
  {
    id: 'junior', minAge: 13, maxAge: 20, elitePoints: { male: 58, female: 56 },
    categories: {
      male: categories([60, 65, 70, 75, 85, 95, 110], 'male'),
      female: categories([49, 53, 57, 61, 69, 77, 86], 'female'),
    },
  },
  {
    id: 'senior', minAge: 15, maxAge: null, elitePoints: { male: 68, female: 64 },
    categories: {
      male: categories([60, 65, 70, 75, 85, 95, 110], 'male'),
      female: categories([49, 53, 57, 61, 69, 77, 86], 'female'),
    },
  },
];

const minimumOverrides = new Map<string, number>([
  ['sub15:male:+85 kg', 161],
  ['sub17:male:+95 kg', 204],
  ['sub15:female:+69 kg', 112],
  ['sub17:female:+77 kg', 161],
]);

export function federationAge(birthYear: number, season = RFEH_STANDARD_YEAR) {
  return season - birthYear;
}

export function applicableRfehAgeGroups(birthYear: number, season = RFEH_STANDARD_YEAR) {
  const age = federationAge(birthYear, season);
  return ageGroups.filter((group) => age >= group.minAge && (group.maxAge === null || age <= group.maxAge));
}

export function assessRfehQualification(input: {
  birthYear: number;
  sex: CompetitionSex;
  bodyWeightKg: number;
  snatchKg: number;
  cleanAndJerkKg: number;
  season?: number;
}): RfehQualification[] {
  const season = input.season ?? RFEH_STANDARD_YEAR;
  const age = federationAge(input.birthYear, season);
  const total = input.snatchKg + input.cleanAndJerkKg;
  return applicableRfehAgeGroups(input.birthYear, season).map((group) => {
    const category = group.categories[input.sex].find((item) => item.limitKg === null || input.bodyWeightKg <= item.limitKg)!;
    const minimumTotalKg = minimumOverrides.get(`${group.id}:${input.sex}:${category.label}`)
      ?? Math.ceil(category.elite100TotalKg * group.elitePoints[input.sex] / 100);
    return {
      ageGroup: group.id,
      age,
      sex: input.sex,
      weightCategory: category.label,
      elitePointsRequired: group.elitePoints[input.sex],
      minimumTotalKg,
      currentTotalKg: total,
      differenceKg: total - minimumTotalKg,
      meetsReference: total >= minimumTotalKg,
    };
  });
}
