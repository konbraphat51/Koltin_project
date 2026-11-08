/** Conversions between SQL rows and domain objects. */
import type { Nutrients } from "@nutri/shared";
import type { DiaryEntry, FoodItem, FoodSource, MealType } from "../domain/Models";

export interface NutrientRow {
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carbohydrate_g: number;
  fiber_g: number;
  salt_g: number;
}

export const nutrientColumnList = "energy_kcal, protein_g, fat_g, carbohydrate_g, fiber_g, salt_g";

export function toNutrients(row: NutrientRow): Nutrients {
  return { energyKcal: row.energy_kcal, proteinG: row.protein_g, fatG: row.fat_g, carbohydrateG: row.carbohydrate_g, fiberG: row.fiber_g, saltG: row.salt_g };
}

export function toNutrientParams(n: Nutrients): number[] {
  return [n.energyKcal, n.proteinG, n.fatG, n.carbohydrateG, n.fiberG, n.saltG];
}

export interface FoodItemRow extends NutrientRow {
  id: number;
  source: FoodSource;
  source_ref: string | null;
  name: string;
  brand: string;
  serving_g: number | null;
}

export function toFoodItem(row: FoodItemRow): FoodItem {
  return { id: row.id, source: row.source, sourceRef: row.source_ref, name: row.name, brand: row.brand, servingG: row.serving_g, per100g: toNutrients(row) };
}

export interface DiaryEntryRow extends NutrientRow {
  id: number;
  date: string;
  meal_type: MealType;
  food_item_id: number | null;
  pending_request_id: number | null;
  name: string;
  amount_g: number;
}

export function toDiaryEntry(row: DiaryEntryRow): DiaryEntry {
  return { id: row.id, date: row.date, mealType: row.meal_type, foodItemId: row.food_item_id, pendingRequestId: row.pending_request_id, name: row.name, amountG: row.amount_g, nutrients: toNutrients(row) };
}
