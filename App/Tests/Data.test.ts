import { ClientOpenAi, LlmError } from "../src/data/ClientOpenAi";
import { ClientOpenFoodFacts } from "../src/data/ClientOpenFoodFacts";
import { ClientServer } from "../src/data/ClientServer";
import { migrateDatabase } from "../src/data/Migrations";
import { RepositoryDiary } from "../src/data/RepositoryDiary";
import { RepositoryFood } from "../src/data/RepositoryFood";
import { RepositoryPending } from "../src/data/RepositoryPending";
import { StoreSettings } from "../src/data/StoreSettings";
import { syncPendingRequests } from "../src/data/SyncPendingRequest";
import type { FoodItem } from "../src/domain/Models";
import { createTestDatabase, type SqliteAdapter } from "./Helpers/SqliteAdapter";

const nutrients = { energyKcal: 200, proteinG: 10, fatG: 5, carbohydrateG: 30, fiberG: 2, saltG: 1 };
const rice: FoodItem = { id: null, source: "CUSTOM", sourceRef: null, name: "My rice", brand: "", servingG: 150, per100g: nutrients };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("repositories", () => {
  let db: SqliteAdapter;
  let food: RepositoryFood;
  let diary: RepositoryDiary;
  beforeEach(async () => {
    db = await createTestDatabase();
    food = new RepositoryFood(db);
    diary = new RepositoryDiary(db);
  });

  it("saves, updates and finds foods; de-duplicates by source and reference", async () => {
    const id = await food.save(rice);
    expect((await food.getById(id))?.name).toBe("My rice");
    await food.save({ ...rice, id, name: "Renamed" });
    expect((await food.listCustom()).map((f) => f.name)).toEqual(["Renamed"]);

    const off: FoodItem = { ...rice, source: "OFF", sourceRef: "4901234567894", name: "Cookie" };
    const first = await food.save(off);
    const second = await food.save({ ...off, name: "Cookie v2" });
    expect(second).toBe(first);
    expect((await food.findByBarcode("4901234567894"))?.name).toBe("Cookie v2");
  });

  it("searches own foods and treats wildcards literally", async () => {
    await food.save(rice);
    expect(await food.searchMine("rice")).toHaveLength(1);
    expect(await food.searchMine("%")).toHaveLength(0);
  });

  it("toggles favorites and removes them with the food", async () => {
    const id = await food.save(rice);
    expect(await food.toggleFavorite(id)).toBe(true);
    expect((await food.listFavorites()).map((f) => f.id)).toEqual([id]);
    await food.delete(id);
    expect(await food.listFavorites()).toEqual([]);
  });

  it("stores diary entries and sums per date", async () => {
    const id = await food.save(rice);
    const entry = { date: "2026-03-01", mealType: "lunch" as const, foodItemId: id, pendingRequestId: null, name: "My rice", amountG: 150, nutrients };
    await diary.add(entry);
    await diary.add({ ...entry, mealType: "dinner" });
    await diary.add({ ...entry, date: "2026-03-02" });
    expect(await diary.listByDate("2026-03-01")).toHaveLength(2);
    const sums = await diary.sumByDate("2026-03-01", "2026-03-31");
    expect(sums["2026-03-01"]?.energyKcal).toBe(400);
    expect(sums["2026-03-02"]?.energyKcal).toBe(200);
    expect((await diary.sumByDate("2026-04-01", "2026-04-30"))["2026-04-01"]).toBeUndefined();
  });

  it("keeps diary snapshots when a food is deleted and ranks frequent foods", async () => {
    const a = await food.save(rice);
    const b = await food.save({ ...rice, name: "Other" });
    const base = { date: "2026-03-01", mealType: "snack" as const, pendingRequestId: null, name: "x", amountG: 100, nutrients };
    await diary.add({ ...base, foodItemId: a });
    await diary.add({ ...base, foodItemId: b });
    await diary.add({ ...base, foodItemId: b });
    expect((await food.listFrequent()).map((f) => f.id)).toEqual([b, a]);
    await food.delete(b);
    const entries = await diary.listByDate("2026-03-01");
    expect(entries).toHaveLength(3);
    expect(entries.filter((e) => e.foodItemId === null)).toHaveLength(2);
  });

  it("deletes entries", async () => {
    const id = await diary.add({ date: "2026-03-01", mealType: "lunch", foodItemId: null, pendingRequestId: null, name: "x", amountG: 1, nutrients });
    await diary.delete(id);
    expect(await diary.listByDate("2026-03-01")).toEqual([]);
  });

  it("migrations are idempotent", async () => {
    await migrateDatabase(db);
    expect((await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version"))?.user_version).toBe(1);
  });
});

describe("pending chain sync", () => {
  it("applies resolved and rejected requests", async () => {
    const db = await createTestDatabase();
    const food = new RepositoryFood(db);
    const diary = new RepositoryDiary(db);
    const pending = new RepositoryPending(db);

    const resolvedId = await pending.add(11, "Mos", "Burger");
    const rejectedId = await pending.add(12, "Mos", "Nonsense");
    await pending.add(13, "Mos", "Still waiting");
    expect(await pending.add(11, "Mos", "Burger")).toBe(resolvedId);

    const zero = { energyKcal: 0, proteinG: 0, fatG: 0, carbohydrateG: 0, fiberG: 0, saltG: 0 };
    await diary.add({ date: "2026-03-01", mealType: "lunch", foodItemId: null, pendingRequestId: resolvedId, name: "Burger (pending)", amountG: 100, nutrients: zero });

    const menuItem = { id: 5, chainId: 1, chainName: "Mos", name: "Burger", servingG: 200, nutrients: { ...nutrients, energyKcal: 400 }, sourceUrl: null };
    const server = {
      getMenuRequestStatuses: async () => [
        { requestId: 11, status: "resolved" as const, menuItem },
        { requestId: 12, status: "rejected" as const, menuItem: null },
        { requestId: 13, status: "open" as const, menuItem: null },
      ],
    };
    expect(await syncPendingRequests(server, pending, food, diary)).toEqual({ resolved: 1, rejected: 1 });

    const [entry] = await diary.listByDate("2026-03-01");
    expect(entry).toMatchObject({ pendingRequestId: null, name: "Burger", amountG: 200 });
    expect(entry?.nutrients.energyKcal).toBe(400);
    expect((await pending.listOpen()).map((p) => p.menuName)).toEqual(["Still waiting"]);
    expect(rejectedId).toBeGreaterThan(0);
    expect(await syncPendingRequests(server, new RepositoryPending(await createTestDatabase()), food, diary)).toEqual({ resolved: 0, rejected: 0 });
  });
});

describe("settings", () => {
  const createStore = () => {
    const map = new Map<string, string>();
    return { getItemSync: (k: string) => map.get(k) ?? null, setItemSync: (k: string, v: string) => void map.set(k, v), removeItemSync: (k: string) => map.delete(k) };
  };
  it("round-trips values and ignores corrupt data", () => {
    const store = createStore();
    const settings = new StoreSettings(store, () => "id-1");
    expect(settings.getProfile()).toBeNull();
    settings.setProfile({ sex: "female", age: 40, heightCm: 160, weightKg: 55, activity: "low" });
    expect(settings.getProfile()?.age).toBe(40);
    store.setItemSync("profile", "{broken");
    expect(settings.getProfile()).toBeNull();
    expect(settings.getOpenAiModel()).toBe("gpt-5-nano");
    expect(settings.getContributeToOff()).toBe(true);
    settings.setContributeToOff(false);
    expect(settings.getContributeToOff()).toBe(false);
    expect(settings.getInstallationId()).toBe("id-1");
    expect(new StoreSettings(store, () => "id-2").getInstallationId()).toBe("id-1");
  });
});

describe("ClientOpenAi", () => {
  const product = { name: "Cookie", brand: "Acme", servingG: 30, ingredientsText: "", per100g: nutrients };
  it("sends images with a strict json schema and parses the result", async () => {
    let sent: { model: string; response_format: { json_schema: { strict: boolean } }; messages: { content: unknown }[] } | undefined;
    const fetchFn = (async (_url: string, init: RequestInit) => {
      sent = JSON.parse(init.body as string);
      expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
      return jsonResponse({ choices: [{ message: { content: JSON.stringify(product) } }] });
    }) as unknown as typeof fetch;
    const result = await new ClientOpenAi("sk-test", "gpt-5-nano", fetchFn).extractProduct(["AAA"]);
    expect(result.name).toBe("Cookie");
    expect(sent?.model).toBe("gpt-5-nano");
    expect(sent?.response_format.json_schema.strict).toBe(true);
    expect(JSON.stringify(sent?.messages[1]?.content)).toContain("data:image/jpeg;base64,AAA");
  });

  it.each([
    [401, "invalidKey"],
    [429, "rateLimited"],
    [500, "failed"],
  ])("maps HTTP %i to %s", async (status, kind) => {
    const fetchFn = (async () => jsonResponse({}, status)) as unknown as typeof fetch;
    await expect(new ClientOpenAi("k", "m", fetchFn).extractProduct([])).rejects.toMatchObject({ kind });
  });

  it("fails on malformed content", async () => {
    const fetchFn = (async () => jsonResponse({ choices: [{ message: { content: "not json" } }] })) as unknown as typeof fetch;
    await expect(new ClientOpenAi("k", "m", fetchFn).extractProduct([])).rejects.toBeInstanceOf(LlmError);
  });
});

describe("ClientServer", () => {
  it("sends the installation header and validates responses", async () => {
    const calls: { url: string; headers: Record<string, string> }[] = [];
    const fetchFn = (async (url: string, init: RequestInit) => {
      calls.push({ url, headers: init.headers as Record<string, string> });
      if (url.includes("/menu-requests") && init.method === "POST") return jsonResponse({ requestId: 3 }, 201);
      return jsonResponse([]);
    }) as unknown as typeof fetch;
    const client = new ClientServer("https://example.test", "uuid-1", fetchFn);
    expect(await client.createMenuRequest("Mos", "Burger")).toBe(3);
    expect(await client.searchMenus("バーガー", "モス")).toEqual([]);
    expect(await client.getMenuRequestStatuses([])).toEqual([]);
    expect(calls[0]?.headers["X-Installation-Id"]).toBe("uuid-1");
    expect(calls[1]?.url).toContain("/v1/menus?q=");
    expect(calls).toHaveLength(2);
  });

  it("throws on server errors and malformed bodies", async () => {
    const bad = new ClientServer("https://example.test", "u", (async () => jsonResponse({ error: "x" }, 429)) as unknown as typeof fetch);
    await expect(bad.searchMenus("x")).rejects.toThrow("429");
    const malformed = new ClientServer("https://example.test", "u", (async () => jsonResponse([{ id: "no" }])) as unknown as typeof fetch);
    await expect(malformed.searchMenus("x")).rejects.toThrow();
  });
});

describe("ClientOpenFoodFacts", () => {
  it("returns null for 404 and maps found products", async () => {
    expect(await new ClientOpenFoodFacts((async () => jsonResponse({ status: 0 }, 404)) as unknown as typeof fetch).findByBarcode("1")).toBeNull();
    const found = (async () => jsonResponse({ status: 1, product: { product_name: "Tea", nutriments: { "energy-kcal_100g": 1 } } })) as unknown as typeof fetch;
    expect((await new ClientOpenFoodFacts(found).findByBarcode("2"))?.name).toBe("Tea");
    await expect(new ClientOpenFoodFacts((async () => jsonResponse({}, 500)) as unknown as typeof fetch).findByBarcode("3")).rejects.toThrow("500");
  });
});
