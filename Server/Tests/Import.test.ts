import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/Index";
import { parseCsv, writeCsv } from "../Scripts/Lib/Csv";
import { buildImportSql } from "../Scripts/Lib/ImportSql";

describe("csv", () => {
  it("parses quoted fields", () => {
    const rows = parseCsv('chain,name\n"A, Inc","He said ""hi"""\n');
    expect(rows).toEqual([{ chain: "A, Inc", name: 'He said "hi"' }]);
  });
  it("round-trips", () => {
    const csv = writeCsv(["a", "b"], [{ a: "x,y", b: 'q"r' }]);
    expect(parseCsv(csv)).toEqual([{ a: "x,y", b: 'q"r' }]);
  });
});

describe("import sql", () => {
  beforeEach(async () => {
    await env.DB.exec("DELETE FROM menu_requests");
    await env.DB.exec("DELETE FROM menu_items");
    await env.DB.exec("DELETE FROM chains");
    await env.DB.exec("DELETE FROM rate_limits");
  });

  const csv = "chain,aliases,name,servingG,energyKcal,proteinG,fatG,carbohydrateG,fiberG,saltG,sourceUrl\nモス,Mos Burger|モスバーガー,テリヤキ バーガー,200,380,17,17,40,2,2.1,https://example.com\n";

  it("registers the item and resolves open requests, including alias matches", async () => {
    const headers = { "Content-Type": "application/json", "X-Installation-Id": "22222222-2222-4222-8222-222222222222" };
    const post = (chainName: string) => app.request("/v1/menu-requests", { method: "POST", headers, body: JSON.stringify({ chainName, menuName: "テリヤキバーガー" }) }, env);
    // different spacing so the normalized menu name differs; matching one uses the exact name
    await post("mos burger");
    const exact = (await (await app.request("/v1/menu-requests", { method: "POST", headers, body: JSON.stringify({ chainName: "Mos Burger", menuName: "テリヤキ バーガー" }) }, env)).json()) as { requestId: number };

    for (const line of buildImportSql(parseCsv(csv)).trim().split("\n")) await env.DB.exec(line);

    const status = (await (await app.request(`/v1/menu-requests?ids=${exact.requestId}`, {}, env)).json()) as { status: string; menuItem: { name: string; servingG: number } }[];
    expect(status[0]?.status).toBe("resolved");
    expect(status[0]?.menuItem.servingG).toBe(200);
  });

  it("is idempotent for the same menu item", async () => {
    const sql = buildImportSql(parseCsv(csv)).trim().split("\n");
    for (let i = 0; i < 2; i++) for (const line of sql) await env.DB.exec(line);
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM menu_items").first<{ n: number }>();
    expect(row?.n).toBe(1);
  });

  it("reports the offending row for invalid input", () => {
    expect(() => buildImportSql([{ chain: "A", name: "B", energyKcal: "x", proteinG: "1", fatG: "1", carbohydrateG: "1", fiberG: "1", saltG: "1" }])).toThrow(/row 2/);
  });

  it("escapes single quotes", () => {
    const sql = buildImportSql([{ chain: "Joe's", name: "It's", energyKcal: "1", proteinG: "1", fatG: "1", carbohydrateG: "1", fiberG: "1", saltG: "1" }]);
    expect(sql).toContain("'Joe''s'");
  });
});
