/** Builds the SQL that registers menu items from batch CSV rows and resolves matching requests. */
import { normalizeText, NutrientsSchema } from "@nutri/shared";
import { z } from "zod";

const optionalNumber = z.preprocess((v) => (v === "" || v === undefined ? undefined : Number(v)), z.number().positive().optional());

const RowSchema = z.object({
  chain: z.string().min(1),
  aliases: z.string().optional().default(""),
  name: z.string().min(1),
  servingG: optionalNumber,
  energyKcal: z.coerce.number(),
  proteinG: z.coerce.number(),
  fatG: z.coerce.number(),
  carbohydrateG: z.coerce.number(),
  fiberG: z.coerce.number(),
  saltG: z.coerce.number(),
  sourceUrl: z.string().optional().default(""),
});

/** Quotes a string as a SQL literal. */
function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function numberOrNull(value: number | undefined): string {
  return value === undefined ? "NULL" : String(value);
}

/** Converts CSV records into one-statement-per-line SQL. Throws with the row number on invalid input. */
export function buildImportSql(records: Record<string, string>[]): string {
  const statements: string[] = [];
  records.forEach((record, index) => {
    const parsed = RowSchema.safeParse(record);
    if (!parsed.success) throw new Error(`row ${index + 2}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
    const row = parsed.data;
    const nutrients = NutrientsSchema.safeParse(row);
    if (!nutrients.success) throw new Error(`row ${index + 2}: nutrients must be non-negative numbers`);

    const chainNorm = normalizeText(row.chain);
    const nameNorm = normalizeText(row.name);
    const aliases = row.aliases
      .split("|")
      .map(normalizeText)
      .filter((a) => a !== "")
      .join("|");
    const chainId = `(SELECT id FROM chains WHERE name_norm = ${quote(chainNorm)})`;

    statements.push(`INSERT INTO chains (name, name_norm, aliases_norm) VALUES (${quote(row.chain)}, ${quote(chainNorm)}, ${quote(aliases)}) ON CONFLICT(name_norm) DO UPDATE SET aliases_norm = CASE WHEN excluded.aliases_norm = '' THEN chains.aliases_norm ELSE excluded.aliases_norm END;`);
    statements.push(`INSERT INTO menu_items (chain_id, name, name_norm, serving_g, energy_kcal, protein_g, fat_g, carbohydrate_g, fiber_g, salt_g, source_url) VALUES (${chainId}, ${quote(row.name)}, ${quote(nameNorm)}, ${numberOrNull(row.servingG)}, ${row.energyKcal}, ${row.proteinG}, ${row.fatG}, ${row.carbohydrateG}, ${row.fiberG}, ${row.saltG}, ${row.sourceUrl ? quote(row.sourceUrl) : "NULL"}) ON CONFLICT(chain_id, name_norm) DO UPDATE SET name = excluded.name, serving_g = excluded.serving_g, energy_kcal = excluded.energy_kcal, protein_g = excluded.protein_g, fat_g = excluded.fat_g, carbohydrate_g = excluded.carbohydrate_g, fiber_g = excluded.fiber_g, salt_g = excluded.salt_g, source_url = excluded.source_url, updated_at = datetime('now');`);
    statements.push(`UPDATE menu_requests SET status = 'resolved', resolved_menu_item_id = (SELECT id FROM menu_items WHERE chain_id = ${chainId} AND name_norm = ${quote(nameNorm)}), updated_at = datetime('now') WHERE menu_norm = ${quote(nameNorm)} AND status = 'open' AND (chain_norm = ${quote(chainNorm)} OR instr('|' || (SELECT aliases_norm FROM chains WHERE name_norm = ${quote(chainNorm)}) || '|', '|' || chain_norm || '|') > 0);`);
  });
  return statements.join("\n") + "\n";
}
