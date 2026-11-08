/** Test adapter exposing node:sqlite through the app's SqlDatabase interface. */
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { migrateDatabase } from "../../src/data/Migrations";
import type { SqlDatabase, SqlValue } from "../../src/data/SqlDatabase";

export class SqliteAdapter implements SqlDatabase {
  private readonly db = new DatabaseSync(":memory:");

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }
  async runAsync(sql: string, params: SqlValue[] = []) {
    const result = this.db.prepare(sql).run(...(params as SQLInputValue[]));
    return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
  }
  async getAllAsync<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...(params as SQLInputValue[])) as T[];
  }
  async getFirstAsync<T>(sql: string, params: SqlValue[] = []): Promise<T | null> {
    return (this.db.prepare(sql).get(...(params as SQLInputValue[])) as T | undefined) ?? null;
  }
}

/** Creates a migrated in-memory database. */
export async function createTestDatabase(): Promise<SqliteAdapter> {
  const db = new SqliteAdapter();
  await migrateDatabase(db);
  return db;
}
