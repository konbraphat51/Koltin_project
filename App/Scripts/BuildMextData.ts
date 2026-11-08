/**
 * Builds assets/Mext/MextFoods.json from the MEXT "Standard Tables of Food Composition in Japan (8th rev., 2023 supplement)" Excel file.
 * Usage: pnpm build:mext [path/to/xlsx]   (downloads the official file when no path is given)
 * Source: https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import * as XLSX from "xlsx";
import type { MextRecord } from "../src/domain/SearchMext";

const officialUrl = "https://www.mext.go.jp/content/20260327-mxt_kagsei-mext-000029402_02.xlsx";
const outPath = join(__dirname, "..", "assets", "Mext", "MextFoods.json");
const identifierRow = 11;
const firstDataRow = 12;

/** Converts a MEXT cell ("(1.2)", "Tr", "-", "*", numbers) to a number; non-numeric markers count as 0. */
export function parseMextCell(cell: unknown): number {
  if (typeof cell === "number") return cell;
  const text = String(cell ?? "")
    .trim()
    .replace(/^\(|\)$/g, "");
  if (text === "" || text === "-" || text === "*" || text === "Tr") return 0;
  const value = Number(text);
  return Number.isFinite(value) ? value : 0;
}

export function buildRecords(rows: unknown[][]): MextRecord[] {
  const identifiers = (rows[identifierRow] ?? []).map((cell) => String(cell ?? "").trim());
  const column = (id: string) => {
    const index = identifiers.indexOf(id);
    if (index < 0) throw new Error(`column ${id} not found`);
    return index;
  };
  const cols = { kcal: column("ENERC_KCAL"), protein: column("PROT-"), fat: column("FAT-"), carbohydrate: column("CHOCDF-"), fiber: column("FIB-"), salt: column("NACL_EQ") };

  const records: MextRecord[] = [];
  for (const row of rows.slice(firstDataRow)) {
    const id = String(row[1] ?? "").trim();
    const name = String(row[3] ?? "").trim();
    if (!/^\d{5}$/.test(id) || name === "") continue;
    records.push({
      id,
      name,
      nutrients: {
        energyKcal: parseMextCell(row[cols.kcal]),
        proteinG: parseMextCell(row[cols.protein]),
        fatG: parseMextCell(row[cols.fat]),
        carbohydrateG: parseMextCell(row[cols.carbohydrate]),
        fiberG: parseMextCell(row[cols.fiber]),
        saltG: parseMextCell(row[cols.salt]),
      },
    });
  }
  return records;
}

async function main(): Promise<void> {
  const path = process.argv[2];
  const workbook = path ? XLSX.readFile(path) : XLSX.read(Buffer.from(await (await fetch(officialUrl)).arrayBuffer()));
  const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  const records = buildRecords(rows);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(records), "utf8");
  console.log(`${records.length} foods written to ${outPath}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
