/** Persistence of food items, favorites and usage statistics. */
import type { FoodItem } from "../domain/Models";
import { nutrientColumnList, toFoodItem, toNutrientParams, type FoodItemRow } from "./RowMapping";
import type { SqlDatabase } from "./SqlDatabase";

const foodColumns = `id, source, source_ref, name, brand, serving_g, ${nutrientColumnList}`;

export class RepositoryFood {
  constructor(private readonly db: SqlDatabase) {}

  /** Inserts the item, or updates it when (source, sourceRef) already exists. Returns the row ID. */
  async save(item: FoodItem): Promise<number> {
    if (item.id !== null) {
      await this.db.runAsync(
        `UPDATE food_items SET name = ?, brand = ?, serving_g = ?, energy_kcal = ?, protein_g = ?, fat_g = ?, carbohydrate_g = ?, fiber_g = ?, salt_g = ? WHERE id = ?`,
        [item.name, item.brand, item.servingG, ...toNutrientParams(item.per100g), item.id],
      );
      return item.id;
    }
    if (item.sourceRef !== null) {
      const existing = await this.db.getFirstAsync<{ id: number }>("SELECT id FROM food_items WHERE source = ? AND source_ref = ?", [item.source, item.sourceRef]);
      if (existing) return this.save({ ...item, id: existing.id });
    }
    const result = await this.db.runAsync(
      `INSERT INTO food_items (source, source_ref, name, brand, serving_g, ${nutrientColumnList}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.source, item.sourceRef, item.name, item.brand, item.servingG, ...toNutrientParams(item.per100g)],
    );
    return result.lastInsertRowId;
  }

  async getById(id: number): Promise<FoodItem | null> {
    const row = await this.db.getFirstAsync<FoodItemRow>(`SELECT ${foodColumns} FROM food_items WHERE id = ?`, [id]);
    return row ? toFoodItem(row) : null;
  }

  /** Looks up a product by barcode among items saved before (any source). */
  async findByBarcode(barcode: string): Promise<FoodItem | null> {
    const row = await this.db.getFirstAsync<FoodItemRow>(`SELECT ${foodColumns} FROM food_items WHERE source IN ('OFF', 'MANUAL') AND source_ref = ?`, [barcode]);
    return row ? toFoodItem(row) : null;
  }

  /** Searches the user's own foods (custom, manual, OFF and chain items used before). */
  async searchMine(query: string, limit = 40): Promise<FoodItem[]> {
    const like = `%${query.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    const rows = await this.db.getAllAsync<FoodItemRow>(`SELECT ${foodColumns} FROM food_items WHERE source != 'MEXT' AND name LIKE ? ESCAPE '\\' ORDER BY name LIMIT ?`, [like, limit]);
    return rows.map(toFoodItem);
  }

  /** Foods the user created (CUSTOM and MANUAL). */
  async listCustom(): Promise<FoodItem[]> {
    const rows = await this.db.getAllAsync<FoodItemRow>(`SELECT ${foodColumns} FROM food_items WHERE source IN ('CUSTOM', 'MANUAL') ORDER BY name`);
    return rows.map(toFoodItem);
  }

  async delete(id: number): Promise<void> {
    await this.db.runAsync("DELETE FROM food_items WHERE id = ?", [id]);
  }

  async isFavorite(id: number): Promise<boolean> {
    return (await this.db.getFirstAsync("SELECT 1 AS x FROM favorites WHERE food_item_id = ?", [id])) !== null;
  }

  /** Toggles the favorite flag; returns the new state. */
  async toggleFavorite(id: number): Promise<boolean> {
    if (await this.isFavorite(id)) {
      await this.db.runAsync("DELETE FROM favorites WHERE food_item_id = ?", [id]);
      return false;
    }
    await this.db.runAsync("INSERT INTO favorites (food_item_id) VALUES (?)", [id]);
    return true;
  }

  async listFavorites(): Promise<FoodItem[]> {
    const rows = await this.db.getAllAsync<FoodItemRow>(`SELECT ${foodColumns.replace(/(\w+)/g, "f.$1")} FROM favorites v JOIN food_items f ON f.id = v.food_item_id ORDER BY v.created_at DESC`);
    return rows.map(toFoodItem);
  }

  /** Most frequently logged foods. */
  async listFrequent(limit = 20): Promise<FoodItem[]> {
    const rows = await this.db.getAllAsync<FoodItemRow>(
      `SELECT ${foodColumns.replace(/(\w+)/g, "f.$1")} FROM diary_entries d JOIN food_items f ON f.id = d.food_item_id GROUP BY f.id ORDER BY COUNT(*) DESC, MAX(d.id) DESC LIMIT ?`,
      [limit],
    );
    return rows.map(toFoodItem);
  }
}
