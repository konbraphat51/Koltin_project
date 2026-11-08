/** D1 queries for chains, menu items and menu requests. */
import type { Chain, MenuItem, MenuRequestStatus } from "@nutri/shared";
import { normalizeText } from "@nutri/shared";

type MenuItemRow = {
  id: number;
  chain_id: number;
  chain_name: string;
  name: string;
  serving_g: number | null;
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carbohydrate_g: number;
  fiber_g: number;
  salt_g: number;
  source_url: string | null;
};

const menuItemSelect = `SELECT m.id, m.chain_id, c.name AS chain_name, m.name, m.serving_g, m.energy_kcal, m.protein_g, m.fat_g, m.carbohydrate_g, m.fiber_g, m.salt_g, m.source_url
  FROM menu_items m JOIN chains c ON c.id = m.chain_id`;

function toMenuItem(row: MenuItemRow): MenuItem {
  return {
    id: row.id,
    chainId: row.chain_id,
    chainName: row.chain_name,
    name: row.name,
    servingG: row.serving_g,
    nutrients: {
      energyKcal: row.energy_kcal,
      proteinG: row.protein_g,
      fatG: row.fat_g,
      carbohydrateG: row.carbohydrate_g,
      fiberG: row.fiber_g,
      saltG: row.salt_g,
    },
    sourceUrl: row.source_url,
  };
}

/** Escapes LIKE wildcards (the queries use ESCAPE with a backslash). */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export async function listChains(db: D1Database): Promise<Chain[]> {
  const { results } = await db.prepare("SELECT id, name FROM chains ORDER BY name").all<Chain>();
  return results;
}

/** Searches menu items by name; optionally restricted to a chain (matched by name or alias). */
export async function searchMenuItems(db: D1Database, query: string, chain: string | undefined, limit = 50): Promise<MenuItem[]> {
  const q = `%${escapeLike(normalizeText(query))}%`;
  if (chain) {
    const chainNorm = normalizeText(chain);
    const aliasLike = `%|${escapeLike(chainNorm)}|%`;
    const { results } = await db
      .prepare(`${menuItemSelect} WHERE m.name_norm LIKE ? ESCAPE '\\' AND (c.name_norm = ? OR '|' || c.aliases_norm || '|' LIKE ? ESCAPE '\\') ORDER BY m.name LIMIT ?`)
      .bind(q, chainNorm, aliasLike, limit)
      .all<MenuItemRow>();
    return results.map(toMenuItem);
  }
  const { results } = await db
    .prepare(`${menuItemSelect} WHERE m.name_norm LIKE ? ESCAPE '\\' ORDER BY c.name, m.name LIMIT ?`)
    .bind(q, limit)
    .all<MenuItemRow>();
  return results.map(toMenuItem);
}

/** Records a not-found request, merging identical ones. Returns the request ID. */
export async function recordMenuRequest(db: D1Database, chainName: string, menuName: string): Promise<number> {
  const row = await db
    .prepare(
      `INSERT INTO menu_requests (chain_norm, menu_norm, raw_chain, raw_menu) VALUES (?, ?, ?, ?)
       ON CONFLICT(chain_norm, menu_norm) DO UPDATE SET request_count = request_count + 1, updated_at = datetime('now')
       RETURNING id`,
    )
    .bind(normalizeText(chainName), normalizeText(menuName), chainName, menuName)
    .first<{ id: number }>();
  if (!row) throw new Error("failed to record menu request");
  return row.id;
}

/** Returns the status of the given requests; unknown IDs are omitted. */
export async function getMenuRequestStatuses(db: D1Database, ids: number[]): Promise<MenuRequestStatus[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const { results } = await db
    .prepare(`SELECT id, status, resolved_menu_item_id FROM menu_requests WHERE id IN (${placeholders})`)
    .bind(...ids)
    .all<{ id: number; status: "open" | "resolved" | "rejected"; resolved_menu_item_id: number | null }>();

  const statuses: MenuRequestStatus[] = [];
  for (const row of results) {
    let menuItem: MenuItem | null = null;
    if (row.status === "resolved" && row.resolved_menu_item_id !== null) {
      const item = await db.prepare(`${menuItemSelect} WHERE m.id = ?`).bind(row.resolved_menu_item_id).first<MenuItemRow>();
      menuItem = item ? toMenuItem(item) : null;
    }
    statuses.push({ requestId: row.id, status: row.status, menuItem });
  }
  return statuses;
}
