/** Reads products from the Open Food Facts API (free, no key; a User-Agent is required). */
import type { FoodItem } from "../domain/Models";
import { mapOffResponse, type OffResponse } from "../domain/MapperOpenFoodFacts";

const baseUrl = "https://world.openfoodfacts.org";
const fields = "product_name,product_name_ja,brands,serving_quantity,nutriments";

export type FetchFn = typeof fetch;

/** Calls the global fetch unbound; passing `fetch` as a method default throws "Illegal invocation" in browsers. */
export const defaultFetch: FetchFn = (input, init) => fetch(input, init);

export class ClientOpenFoodFacts {
  constructor(private readonly fetchFn: FetchFn = defaultFetch) {}

  /** Returns null when the product is unknown or has no nutrition data. */
  async findByBarcode(barcode: string): Promise<FoodItem | null> {
    const response = await this.fetchFn(`${baseUrl}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${fields}`, {
      headers: { "User-Agent": "NutriApp/0.1 (mobile)" },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Open Food Facts error ${response.status}`);
    return mapOffResponse(barcode, (await response.json()) as OffResponse);
  }
}
