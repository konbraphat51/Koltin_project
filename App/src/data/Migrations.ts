/** Local database schema, versioned with PRAGMA user_version. */
import type { SqlDatabase } from "./SqlDatabase";

const nutrientColumns = (suffix: string) => `energy_kcal${suffix} REAL NOT NULL, protein_g${suffix} REAL NOT NULL, fat_g${suffix} REAL NOT NULL, carbohydrate_g${suffix} REAL NOT NULL, fiber_g${suffix} REAL NOT NULL, salt_g${suffix} REAL NOT NULL`;

const migrations: string[] = [
  `
  CREATE TABLE food_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL CHECK (source IN ('OFF', 'MEXT', 'CHAIN', 'CUSTOM', 'MANUAL')),
    source_ref TEXT,
    name TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT '',
    serving_g REAL,
    ${nutrientColumns("")},
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (source, source_ref)
  );
  CREATE TABLE diary_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    food_item_id INTEGER REFERENCES food_items(id) ON DELETE SET NULL,
    pending_request_id INTEGER,
    name TEXT NOT NULL,
    amount_g REAL NOT NULL,
    ${nutrientColumns("")},
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_diary_entries_date ON diary_entries(date);
  CREATE TABLE favorites (
    food_item_id INTEGER PRIMARY KEY REFERENCES food_items(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE pending_chain_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_request_id INTEGER NOT NULL UNIQUE,
    chain_name TEXT NOT NULL,
    menu_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `,
];

/** Applies any migrations newer than the database's user_version. */
export async function migrateDatabase(db: SqlDatabase): Promise<void> {
  await db.execAsync("PRAGMA foreign_keys = ON");
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const current = row?.user_version ?? 0;
  for (let version = current; version < migrations.length; version++) {
    await db.execAsync(migrations[version]!);
    await db.execAsync(`PRAGMA user_version = ${version + 1}`);
  }
}
