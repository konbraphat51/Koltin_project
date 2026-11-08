/** Exports open not-found requests, most requested first, as CSV for the developer's manual batch. */
import { writeFileSync } from "node:fs";
import { writeCsv } from "./Lib/Csv";
import { queryRows } from "./Lib/Wrangler";

type RequestRow = { id: number; raw_chain: string; raw_menu: string; request_count: number; created_at: string };

const args = process.argv.slice(2);
const isRemote = args.includes("--remote");
const outPath = args.find((a) => !a.startsWith("--")) ?? "OpenRequests.csv";

const rows = queryRows<RequestRow>("SELECT id, raw_chain, raw_menu, request_count, created_at FROM menu_requests WHERE status = 'open' ORDER BY request_count DESC, created_at ASC", isRemote);
const csv = writeCsv(
  ["id", "chain", "menu", "count", "createdAt"],
  rows.map((r) => ({ id: r.id, chain: r.raw_chain, menu: r.raw_menu, count: r.request_count, createdAt: r.created_at })),
);
writeFileSync(outPath, csv, "utf8");
console.log(`${rows.length} open requests written to ${outPath} (${isRemote ? "remote" : "local"} DB)`);
