/** Maps an Open Food Facts product response to a FoodItem. */
import type { FoodItem } from "./Models";

interface OffProduct {
  product_name?: string;
  product_name_ja?: string;
  brands?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
}

export interface OffResponse {
  status?: number;
  product?: OffProduct;
}

function readNumber(source: Record<string, number | string | undefined>, key: string): number | null {
  const value = Number(source[key]);
  return source[key] === undefined || source[key] === "" || Number.isNaN(value) ? null : value;
}

/** Returns null when OFF has no product or no usable nutrition data. */
export function mapOffResponse(barcode: string, response: OffResponse): FoodItem | null {
  const product = response.product;
  if (response.status !== 1 || !product?.nutriments) return null;
  const n = product.nutriments;

  const kcalDirect = readNumber(n, "energy-kcal_100g");
  const kj = readNumber(n, "energy_100g");
  const energyKcal = kcalDirect ?? (kj === null ? null : Math.round(kj / 4.184));
  if (energyKcal === null) return null;

  const salt = readNumber(n, "salt_100g");
  const sodium = readNumber(n, "sodium_100g");
  const serving = Number(product.serving_quantity);

  return {
    id: null,
    source: "OFF",
    sourceRef: barcode,
    name: (product.product_name_ja || product.product_name || barcode).trim(),
    brand: (product.brands ?? "").split(",")[0]?.trim() ?? "",
    servingG: serving > 0 ? serving : null,
    per100g: {
      energyKcal,
      proteinG: readNumber(n, "proteins_100g") ?? 0,
      fatG: readNumber(n, "fat_100g") ?? 0,
      carbohydrateG: readNumber(n, "carbohydrates_100g") ?? 0,
      fiberG: readNumber(n, "fiber_100g") ?? 0,
      saltG: salt ?? (sodium === null ? 0 : Math.round(sodium * 2.54 * 100) / 100),
    },
  };
}
