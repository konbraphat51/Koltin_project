/** Nutrient values and their schema, shared by App and Server. All values are per 100 g unless stated otherwise. */
import { z } from "zod";

/** Core nutrient set of the MVP. */
export const NutrientsSchema = z.object({
  energyKcal: z.number().min(0),
  proteinG: z.number().min(0),
  fatG: z.number().min(0),
  carbohydrateG: z.number().min(0),
  fiberG: z.number().min(0),
  saltG: z.number().min(0),
});

export type Nutrients = z.infer<typeof NutrientsSchema>;

/** Nutrient keys in display order. */
export const nutrientKeys = ["energyKcal", "proteinG", "fatG", "carbohydrateG", "fiberG", "saltG"] as const;

/** Returns all-zero nutrients. */
export function createEmptyNutrients(): Nutrients {
  return { energyKcal: 0, proteinG: 0, fatG: 0, carbohydrateG: 0, fiberG: 0, saltG: 0 };
}

/** Scales per-100g nutrients to the given amount in grams. */
export function scaleNutrients(per100g: Nutrients, grams: number): Nutrients {
  const factor = grams / 100;
  const result = createEmptyNutrients();
  for (const key of nutrientKeys) {
    result[key] = round1(per100g[key] * factor);
  }
  return result;
}

/** Sums nutrient sets. */
export function sumNutrients(items: Nutrients[]): Nutrients {
  const result = createEmptyNutrients();
  for (const item of items) {
    for (const key of nutrientKeys) {
      result[key] += item[key];
    }
  }
  for (const key of nutrientKeys) {
    result[key] = round1(result[key]);
  }
  return result;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
