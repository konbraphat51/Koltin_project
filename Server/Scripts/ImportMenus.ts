/**
 * Imports researched menu items from CSV and marks matching requests resolved.
 * CSV columns: chain, aliases (pipe separated, optional), name, servingG, energyKcal, proteinG, fatG, carbohydrateG, fiberG, saltG, sourceUrl
 * Nutrient values are per serving.
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCsv } from "./Lib/Csv";
import { buildImportSql } from "./Lib/ImportSql";
import { executeFile } from "./Lib/Wrangler";

const args = process.argv.slice(2);
const isRemote = args.includes("--remote");
const csvPath = args.find((a) => !a.startsWith("--"));
if (!csvPath) {
  console.error("usage: pnpm menus:import <file.csv> [--remote]");
  process.exit(1);
}

const records = parseCsv(readFileSync(csvPath, "utf8"));
const sql = buildImportSql(records);
const sqlPath = join(mkdtempSync(join(tmpdir(), "nutri-import-")), "Import.sql");
writeFileSync(sqlPath, sql, "utf8");
executeFile(sqlPath, isRemote);
console.log(`${records.length} menu items imported (${isRemote ? "remote" : "local"} DB)`);
