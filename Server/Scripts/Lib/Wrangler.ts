/** Thin wrapper around `wrangler d1 execute` for the batch scripts. */
import { execFileSync } from "node:child_process";

const databaseName = "nutri-db";

function runWrangler(args: string[], isRemote: boolean): string {
  const target = isRemote ? "--remote" : "--local";
  return execFileSync("pnpm", ["exec", "wrangler", "d1", "execute", databaseName, target, ...args], { encoding: "utf8", shell: true, maxBuffer: 64 * 1024 * 1024 });
}

/** Runs a SELECT and returns its rows. */
export function queryRows<T>(sql: string, isRemote: boolean): T[] {
  const output = runWrangler(["--json", "--command", JSON.stringify(sql)], isRemote);
  const parsed = JSON.parse(output.slice(output.indexOf("["))) as { results: T[] }[];
  return parsed[0]?.results ?? [];
}

/** Runs a SQL file. */
export function executeFile(path: string, isRemote: boolean): void {
  runWrangler(["--file", JSON.stringify(path)], isRemote);
}
