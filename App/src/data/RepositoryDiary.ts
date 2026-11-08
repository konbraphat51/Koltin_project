/** Persistence of diary entries and per-day nutrient totals. */
import { sumNutrients, type Nutrients } from "@nutri/shared";
import type { DiaryEntry, NewDiaryEntry } from "../domain/Models";
import { nutrientColumnList, toDiaryEntry, toNutrientParams, type DiaryEntryRow } from "./RowMapping";
import type { SqlDatabase } from "./SqlDatabase";

const diaryColumns = `id, date, meal_type, food_item_id, pending_request_id, name, amount_g, ${nutrientColumnList}`;

export class RepositoryDiary {
  constructor(private readonly db: SqlDatabase) {}

  async add(entry: NewDiaryEntry): Promise<number> {
    const result = await this.db.runAsync(
      `INSERT INTO diary_entries (date, meal_type, food_item_id, pending_request_id, name, amount_g, ${nutrientColumnList}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [entry.date, entry.mealType, entry.foodItemId, entry.pendingRequestId, entry.name, entry.amountG, ...toNutrientParams(entry.nutrients)],
    );
    return result.lastInsertRowId;
  }

  async listByDate(date: string): Promise<DiaryEntry[]> {
    const rows = await this.db.getAllAsync<DiaryEntryRow>(`SELECT ${diaryColumns} FROM diary_entries WHERE date = ? ORDER BY id`, [date]);
    return rows.map(toDiaryEntry);
  }

  async delete(id: number): Promise<void> {
    await this.db.runAsync("DELETE FROM diary_entries WHERE id = ?", [id]);
  }

  /** Total nutrients per date for dates in [from, to]; dates without entries are omitted. */
  async sumByDate(from: string, to: string): Promise<Record<string, Nutrients>> {
    const rows = await this.db.getAllAsync<DiaryEntryRow>(`SELECT ${diaryColumns} FROM diary_entries WHERE date BETWEEN ? AND ? ORDER BY date`, [from, to]);
    const byDate = new Map<string, Nutrients[]>();
    for (const entry of rows.map(toDiaryEntry)) {
      byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry.nutrients]);
    }
    return Object.fromEntries([...byDate].map(([date, list]) => [date, sumNutrients(list)]));
  }

  /** Replaces the provisional values of entries waiting on a chain request. */
  async resolvePending(pendingRequestId: number, foodItemId: number, name: string, amountG: number, nutrients: Nutrients): Promise<void> {
    await this.db.runAsync(
      `UPDATE diary_entries SET pending_request_id = NULL, food_item_id = ?, name = ?, amount_g = ?, energy_kcal = ?, protein_g = ?, fat_g = ?, carbohydrate_g = ?, fiber_g = ?, salt_g = ? WHERE pending_request_id = ?`,
      [foodItemId, name, amountG, ...toNutrientParams(nutrients), pendingRequestId],
    );
  }
}
