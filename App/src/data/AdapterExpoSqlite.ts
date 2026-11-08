/** Adapts expo-sqlite's SQLiteDatabase to the app's SqlDatabase interface (params become optional). */
import type { SQLiteDatabase } from "expo-sqlite";
import type { SqlDatabase } from "./SqlDatabase";

export function adaptExpoSqlite(db: SQLiteDatabase): SqlDatabase {
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: (sql, params = []) => db.runAsync(sql, params),
    getAllAsync: <T,>(sql: string, params: (string | number | null)[] = []) => db.getAllAsync<T>(sql, params),
    getFirstAsync: <T,>(sql: string, params: (string | number | null)[] = []) => db.getFirstAsync<T>(sql, params),
  };
}
