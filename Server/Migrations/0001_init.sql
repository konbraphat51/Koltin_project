CREATE TABLE chains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_norm TEXT NOT NULL UNIQUE,
  aliases_norm TEXT NOT NULL DEFAULT ''
);

CREATE TABLE menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id INTEGER NOT NULL REFERENCES chains(id),
  name TEXT NOT NULL,
  name_norm TEXT NOT NULL,
  serving_g REAL,
  energy_kcal REAL NOT NULL,
  protein_g REAL NOT NULL,
  fat_g REAL NOT NULL,
  carbohydrate_g REAL NOT NULL,
  fiber_g REAL NOT NULL,
  salt_g REAL NOT NULL,
  source_url TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (chain_id, name_norm)
);
CREATE INDEX idx_menu_items_name_norm ON menu_items(name_norm);

CREATE TABLE menu_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_norm TEXT NOT NULL,
  menu_norm TEXT NOT NULL,
  raw_chain TEXT NOT NULL,
  raw_menu TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),
  resolved_menu_item_id INTEGER REFERENCES menu_items(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (chain_norm, menu_norm)
);

CREATE TABLE rate_limits (
  key_hash TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key_hash, day)
);
