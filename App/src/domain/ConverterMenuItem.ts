/** Converts a server menu item (nutrients per serving) to a FoodItem (nutrients per 100 g). */
import { scaleNutrients, type MenuItem } from "@nutri/shared";
import type { FoodItem } from "./Models";

/** When the serving size is unknown, one serving is treated as 100 g. */
export function convertMenuItem(item: MenuItem): FoodItem {
  const servingG = item.servingG ?? 100;
  return {
    id: null,
    source: "CHAIN",
    sourceRef: String(item.id),
    name: item.name,
    brand: item.chainName,
    servingG,
    per100g: scaleNutrients(item.nutrients, (100 * 100) / servingG),
  };
}
