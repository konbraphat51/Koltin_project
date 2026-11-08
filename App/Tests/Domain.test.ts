import { calculateBasalMetabolism, calculateGoal } from "../src/domain/CalculatorGoal";
import { addDays, formatDate, listDatesEndingAt, parseDate } from "../src/domain/Dates";
import { convertMenuItem } from "../src/domain/ConverterMenuItem";
import { mapOffResponse } from "../src/domain/MapperOpenFoodFacts";
import { parseLlmProduct } from "../src/domain/ParserLlmProduct";
import { createMextIndex, searchMext } from "../src/domain/SearchMext";
import { buildRecords, parseMextCell } from "../Scripts/BuildMextData";
import mextFoods from "../assets/Mext/MextFoods.json";
import type { Profile } from "../src/domain/Models";

const profile: Profile = { sex: "male", age: 30, heightCm: 170, weightKg: 65, activity: "normal" };

describe("goal calculation", () => {
  it("computes a plausible basal metabolism (Ganpule)", () => {
    expect(Math.round(calculateBasalMetabolism(profile))).toBe(1497);
  });
  it("derives PFC from energy and applies overrides", () => {
    const goal = calculateGoal(profile);
    expect(goal.energyKcal).toBe(2620);
    expect(goal.proteinG).toBe(Math.round((2620 * 0.15) / 4));
    expect(calculateGoal(profile, { energyKcal: 2000, proteinG: undefined }).energyKcal).toBe(2000);
    expect(calculateGoal(profile, { proteinG: 90 }).proteinG).toBe(90);
  });
});

describe("dates", () => {
  it("formats and shifts local dates across month ends", () => {
    expect(formatDate(parseDate("2026-02-28"))).toBe("2026-02-28");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("lists the last N dates oldest first", () => {
    expect(listDatesEndingAt("2026-03-02", 3)).toEqual(["2026-02-28", "2026-03-01", "2026-03-02"]);
  });
});

describe("Open Food Facts mapping", () => {
  const response = { status: 1, product: { product_name: "Cookie", brands: "Acme, Other", serving_quantity: "30", nutriments: { "energy-kcal_100g": 480, proteins_100g: 6, fat_100g: 22, carbohydrates_100g: 64, fiber_100g: 2, sodium_100g: 0.2 } } };
  it("maps fields and converts sodium to salt", () => {
    const item = mapOffResponse("4901234567894", response)!;
    expect(item).toMatchObject({ source: "OFF", sourceRef: "4901234567894", name: "Cookie", brand: "Acme", servingG: 30 });
    expect(item.per100g.saltG).toBe(0.51);
  });
  it("falls back to kJ for energy", () => {
    const item = mapOffResponse("1", { status: 1, product: { nutriments: { energy_100g: 418.4 } } })!;
    expect(item.per100g.energyKcal).toBe(100);
  });
  it("returns null for unknown products or missing energy", () => {
    expect(mapOffResponse("1", { status: 0 })).toBeNull();
    expect(mapOffResponse("1", { status: 1, product: { nutriments: { proteins_100g: 1 } } })).toBeNull();
  });
});

describe("LLM product parsing", () => {
  const valid = { name: "x", brand: "", servingG: null, ingredientsText: "", per100g: { energyKcal: 1, proteinG: 1, fatG: 1, carbohydrateG: 1, fiberG: 0, saltG: 0 } };
  it("accepts a valid result", () => {
    expect(parseLlmProduct(JSON.stringify(valid)).name).toBe("x");
  });
  it("rejects wrong shapes and negative values", () => {
    expect(() => parseLlmProduct(JSON.stringify({ name: "x" }))).toThrow();
    expect(() => parseLlmProduct(JSON.stringify({ ...valid, per100g: { ...valid.per100g, fatG: -1 } }))).toThrow();
  });
});

describe("menu item conversion", () => {
  const menuItem = { id: 7, chainId: 1, chainName: "Mos", name: "Burger", servingG: 200, nutrients: { energyKcal: 400, proteinG: 20, fatG: 10, carbohydrateG: 50, fiberG: 4, saltG: 2 }, sourceUrl: null };
  it("converts per-serving values to per 100 g", () => {
    const item = convertMenuItem(menuItem);
    expect(item.per100g.energyKcal).toBe(200);
    expect(item).toMatchObject({ source: "CHAIN", sourceRef: "7", servingG: 200, brand: "Mos" });
  });
  it("treats unknown serving as 100 g", () => {
    expect(convertMenuItem({ ...menuItem, servingG: null }).per100g.energyKcal).toBe(400);
  });
});

describe("MEXT", () => {
  it("parses special cell markers", () => {
    expect([parseMextCell("(1.5)"), parseMextCell("Tr"), parseMextCell("-"), parseMextCell("*"), parseMextCell(""), parseMextCell(3)]).toEqual([1.5, 0, 0, 0, 0, 3]);
  });
  it("fails loudly when columns are missing", () => {
    expect(() => buildRecords([])).toThrow(/not found/);
  });
  const index = createMextIndex(mextFoods);
  it("ships the full table", () => {
    expect(mextFoods.length).toBeGreaterThan(2400);
  });
  it("finds white rice with sane values", () => {
    const hits = searchMext(index, "精白米 うるち");
    expect(hits[0]?.per100g.energyKcal).toBeGreaterThan(300);
  });
  it("returns nothing for blank queries", () => {
    expect(searchMext(index, "   ")).toEqual([]);
  });
});
