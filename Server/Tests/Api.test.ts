import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/Index";

const installationId = "11111111-1111-4111-8111-111111111111";
const headers = { "Content-Type": "application/json", "X-Installation-Id": installationId };

async function call(path: string, init?: RequestInit) {
  return app.request(path, init, env);
}

async function seedMenu() {
  await env.DB.exec("DELETE FROM menu_requests");
  await env.DB.exec("DELETE FROM menu_items");
  await env.DB.exec("DELETE FROM chains");
  await env.DB.exec("DELETE FROM rate_limits");
  await env.DB.exec("INSERT INTO chains (id, name, name_norm, aliases_norm) VALUES (1, 'マクドナルド', 'マクドナルド', 'mcdonald''s|マック')");
  await env.DB.exec("INSERT INTO menu_items (chain_id, name, name_norm, serving_g, energy_kcal, protein_g, fat_g, carbohydrate_g, fiber_g, salt_g) VALUES (1, 'ビッグマック', 'ビッグマック', 217, 525, 26, 28, 42, 3, 2.7)");
}

beforeEach(seedMenu);

describe("menus", () => {
  it("lists chains", async () => {
    const res = await call("/v1/chains");
    expect(await res.json()).toEqual([{ id: 1, name: "マクドナルド" }]);
  });

  it("searches by name, normalizing the query", async () => {
    const res = await call(`/v1/menus?q=${encodeURIComponent("ビッグ")}`);
    const items = (await res.json()) as { name: string; nutrients: { energyKcal: number } }[];
    expect(items).toHaveLength(1);
    expect(items[0]?.nutrients.energyKcal).toBe(525);
  });

  it("filters by chain alias", async () => {
    const hit = await call(`/v1/menus?q=${encodeURIComponent("ビッグ")}&chain=${encodeURIComponent("マック")}`);
    expect(await hit.json()).toHaveLength(1);
    const miss = await call(`/v1/menus?q=${encodeURIComponent("ビッグ")}&chain=${encodeURIComponent("モス")}`);
    expect(await miss.json()).toHaveLength(0);
  });

  it("treats LIKE wildcards literally", async () => {
    const res = await call("/v1/menus?q=%25");
    expect(await res.json()).toHaveLength(0);
  });

  it("requires q", async () => {
    expect((await call("/v1/menus")).status).toBe(400);
  });
});

describe("menu requests", () => {
  const body = (menuName: string) => JSON.stringify({ chainName: "モス", menuName });

  it("requires an installation id", async () => {
    const res = await call("/v1/menu-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: body("テリヤキ") });
    expect(res.status).toBe(400);
  });

  it("rejects invalid bodies", async () => {
    const res = await call("/v1/menu-requests", { method: "POST", headers, body: JSON.stringify({ chainName: "" }) });
    expect(res.status).toBe(400);
  });

  it("merges identical requests and counts them", async () => {
    const first = (await (await call("/v1/menu-requests", { method: "POST", headers, body: body("テリヤキ　バーガー") })).json()) as { requestId: number };
    const second = (await (await call("/v1/menu-requests", { method: "POST", headers, body: body("テリヤキ バーガー") })).json()) as { requestId: number };
    expect(second.requestId).toBe(first.requestId);
    const row = await env.DB.prepare("SELECT request_count FROM menu_requests WHERE id = ?").bind(first.requestId).first<{ request_count: number }>();
    expect(row?.request_count).toBe(2);
  });

  it("reports open then resolved status", async () => {
    const { requestId } = (await (await call("/v1/menu-requests", { method: "POST", headers, body: body("ライスバーガー") })).json()) as { requestId: number };
    const open = (await (await call(`/v1/menu-requests?ids=${requestId},999`)).json()) as { status: string; menuItem: unknown }[];
    expect(open).toEqual([{ requestId, status: "open", menuItem: null }]);

    await env.DB.exec("INSERT INTO chains (id, name, name_norm) VALUES (2, 'モス', 'モス')");
    await env.DB.exec("INSERT INTO menu_items (id, chain_id, name, name_norm, energy_kcal, protein_g, fat_g, carbohydrate_g, fiber_g, salt_g) VALUES (50, 2, 'ライスバーガー', 'ライスバーガー', 300, 10, 8, 45, 2, 1.5)");
    await env.DB.prepare("UPDATE menu_requests SET status = 'resolved', resolved_menu_item_id = 50 WHERE id = ?").bind(requestId).run();
    const resolved = (await (await call(`/v1/menu-requests?ids=${requestId}`)).json()) as { status: string; menuItem: { name: string } | null }[];
    expect(resolved[0]?.status).toBe("resolved");
    expect(resolved[0]?.menuItem?.name).toBe("ライスバーガー");
  });

  it("limits requests per installation", async () => {
    const limit = Number(env.POST_DAILY_LIMIT);
    let last = 0;
    for (let i = 0; i <= limit; i++) {
      last = (await call("/v1/menu-requests", { method: "POST", headers, body: body(`メニュー${i}`) })).status;
    }
    expect(last).toBe(429);
  });
});

describe("off relay", () => {
  it("returns 503 when not configured", async () => {
    const res = await call("/v1/off/products", {
      method: "POST",
      headers,
      body: JSON.stringify({ barcode: "4901234567894", name: "x", nutrients: { energyKcal: 1, proteinG: 1, fatG: 1, carbohydrateG: 1, fiberG: 1, saltG: 1 } }),
    });
    expect(res.status).toBe(503);
  });
});
