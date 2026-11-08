/** Computes daily energy and PFC targets from a profile (Ganpule formula, Japanese DRI style). */
import type { ActivityLevel, NutrientGoal, Profile } from "./Models";

const activityFactor: Record<ActivityLevel, number> = { low: 1.5, normal: 1.75, high: 2.0 };

/** Default PFC energy ratios: protein 15%, fat 25%, carbohydrate 60% (inside the DRI ranges). */
export const defaultPfcRatio = { protein: 0.15, fat: 0.25, carbohydrate: 0.6 } as const;

/** Basal metabolic rate in kcal/day (Ganpule et al.). */
export function calculateBasalMetabolism(profile: Profile): number {
  const sexTerm = profile.sex === "male" ? 1 : 2;
  const mjPerDay = 0.1238 + 0.0481 * profile.weightKg + 0.0234 * profile.heightCm - 0.0138 * profile.age - 0.5473 * sexTerm;
  return (mjPerDay * 1000) / 4.186;
}

/** Daily goals computed from a profile; `overrides` replace individual values. */
export function calculateGoal(profile: Profile, overrides: Partial<NutrientGoal> = {}): NutrientGoal {
  const energyKcal = Math.round(calculateBasalMetabolism(profile) * activityFactor[profile.activity]);
  const base: NutrientGoal = {
    energyKcal,
    proteinG: Math.round((energyKcal * defaultPfcRatio.protein) / 4),
    fatG: Math.round((energyKcal * defaultPfcRatio.fat) / 9),
    carbohydrateG: Math.round((energyKcal * defaultPfcRatio.carbohydrate) / 4),
  };
  return { ...base, ...removeUndefined(overrides) };
}

function removeUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}
