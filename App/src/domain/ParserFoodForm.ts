/** Converts the text values of the food form into validated numbers. */
import { createEmptyNutrients, nutrientKeys, type Nutrients } from "@nutri/shared";

export interface FoodFormValues {
  name: string;
  brand: string;
  servingG: string;
  nutrients: Record<keyof Nutrients, string>;
}

export interface FoodFormResult {
  name: string;
  brand: string;
  servingG: number | null;
  per100g: Nutrients;
}

export function createEmptyFoodForm(): FoodFormValues {
  return { name: "", brand: "", servingG: "", nutrients: Object.fromEntries(nutrientKeys.map((k) => [k, ""])) as Record<keyof Nutrients, string> };
}

/** Accepts full-width digits and decimal commas; empty is treated as 0 for nutrients. Returns null if invalid. */
export function parseNumberText(text: string): number | null {
  const normalized = text.normalize("NFKC").trim().replace(",", ".");
  if (normalized === "") return 0;
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

export function parseFoodForm(values: FoodFormValues): FoodFormResult | null {
  const name = values.name.trim();
  if (name === "") return null;
  const per100g = createEmptyNutrients();
  for (const key of nutrientKeys) {
    const value = parseNumberText(values.nutrients[key]);
    if (value === null) return null;
    per100g[key] = value;
  }
  const serving = values.servingG.trim() === "" ? null : parseNumberText(values.servingG);
  if (serving === null && values.servingG.trim() !== "") return null;
  if (serving !== null && serving <= 0) return null;
  return { name, brand: values.brand.trim(), servingG: serving, per100g };
}

/** Fills the form from an existing food or an LLM result. */
export function toFoodForm(item: { name: string; brand: string; servingG: number | null; per100g: Nutrients }): FoodFormValues {
  return {
    name: item.name,
    brand: item.brand,
    servingG: item.servingG === null ? "" : String(item.servingG),
    nutrients: Object.fromEntries(nutrientKeys.map((k) => [k, String(item.per100g[k])])) as Record<keyof Nutrients, string>,
  };
}
