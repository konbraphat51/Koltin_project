/** Core domain models of the app. */
import type { Nutrients } from "@nutri/shared";

export type FoodSource = "OFF" | "MEXT" | "CHAIN" | "CUSTOM" | "MANUAL";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

/** A food whose nutrients are expressed per 100 g. */
export interface FoodItem {
  id: number | null;
  source: FoodSource;
  sourceRef: string | null;
  name: string;
  brand: string;
  /** Grams of one serving, if known. */
  servingG: number | null;
  per100g: Nutrients;
}

export interface DiaryEntry {
  id: number;
  /** Local date, `YYYY-MM-DD`. */
  date: string;
  mealType: MealType;
  foodItemId: number | null;
  /** Set while the chain menu is still waiting to be registered on the server. */
  pendingRequestId: number | null;
  name: string;
  amountG: number;
  /** Snapshot of the nutrients for `amountG`. */
  nutrients: Nutrients;
}

export type NewDiaryEntry = Omit<DiaryEntry, "id">;

export type Sex = "male" | "female";
export type ActivityLevel = "low" | "normal" | "high";

export interface Profile {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
}

/** Daily targets. */
export interface NutrientGoal {
  energyKcal: number;
  proteinG: number;
  fatG: number;
  carbohydrateG: number;
}

export type PendingStatus = "open" | "resolved" | "rejected";

export interface PendingChainRequest {
  id: number;
  serverRequestId: number;
  chainName: string;
  menuName: string;
  status: PendingStatus;
}
