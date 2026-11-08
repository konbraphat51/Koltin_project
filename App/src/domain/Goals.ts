/** Resolves the effective daily goal from the stored profile and overrides. */
import { calculateGoal } from "./CalculatorGoal";
import type { MealType, NutrientGoal, Profile } from "./Models";

/** Returns null until a profile (or a complete set of overrides) exists. */
export function resolveGoal(profile: Profile | null, overrides: Partial<NutrientGoal>): NutrientGoal | null {
  if (profile) return calculateGoal(profile, overrides);
  if (overrides.energyKcal && overrides.proteinG && overrides.fatG && overrides.carbohydrateG) return overrides as NutrientGoal;
  return null;
}

/** Default meal for the given hour of day. */
export function guessMealType(hour: number): MealType {
  if (hour >= 5 && hour < 10) return "breakfast";
  if (hour >= 10 && hour < 15) return "lunch";
  if (hour >= 17 && hour < 22) return "dinner";
  return "snack";
}
