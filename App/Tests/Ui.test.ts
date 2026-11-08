import { guessMealType, resolveGoal } from "../src/domain/Goals";
import { createEmptyFoodForm, parseFoodForm, parseNumberText, toFoodForm } from "../src/domain/ParserFoodForm";
import en from "../src/i18n/Locales/en.json";
import ja from "../src/i18n/Locales/ja.json";

function flattenKeys(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) => (typeof child === "object" && child !== null ? flattenKeys(child, `${prefix}${key}.`) : [`${prefix}${key}`]));
}

describe("locales", () => {
  it("English and Japanese define the same keys", () => {
    expect(flattenKeys(ja).sort()).toEqual(flattenKeys(en).sort());
  });
  it("has no empty strings", () => {
    const values = (obj: object): string[] => Object.values(obj).flatMap((v) => (typeof v === "object" ? values(v) : [String(v)]));
    expect(values(en).filter((v) => v.trim() === "")).toEqual([]);
    expect(values(ja).filter((v) => v.trim() === "")).toEqual([]);
  });
});

describe("number parsing", () => {
  it.each([
    ["12.5", 12.5],
    ["１２", 12],
    ["3,5", 3.5],
    ["", 0],
    ["abc", null],
    ["-1", null],
    ["1e3", null],
  ])("parses %p", (text, expected) => {
    expect(parseNumberText(text)).toBe(expected);
  });
});

describe("food form", () => {
  const filled = () => {
    const form = createEmptyFoodForm();
    form.name = " Rice ";
    form.nutrients.energyKcal = "340";
    return form;
  };
  it("parses a valid form, trimming and defaulting blanks to 0", () => {
    const parsed = parseFoodForm(filled())!;
    expect(parsed.name).toBe("Rice");
    expect(parsed.per100g.energyKcal).toBe(340);
    expect(parsed.per100g.fatG).toBe(0);
    expect(parsed.servingG).toBeNull();
  });
  it("rejects blank names, bad numbers and non-positive servings", () => {
    expect(parseFoodForm(createEmptyFoodForm())).toBeNull();
    expect(parseFoodForm({ ...filled(), nutrients: { ...filled().nutrients, fatG: "x" } })).toBeNull();
    expect(parseFoodForm({ ...filled(), servingG: "0" })).toBeNull();
    expect(parseFoodForm({ ...filled(), servingG: "abc" })).toBeNull();
  });
  it("round-trips through toFoodForm", () => {
    const parsed = parseFoodForm({ ...filled(), servingG: "150" })!;
    expect(parseFoodForm(toFoodForm(parsed))).toEqual(parsed);
  });
});

describe("goals and meals", () => {
  const profile = { sex: "female" as const, age: 30, heightCm: 160, weightKg: 50, activity: "normal" as const };
  it("needs a profile or complete overrides", () => {
    expect(resolveGoal(null, {})).toBeNull();
    expect(resolveGoal(null, { energyKcal: 2000 })).toBeNull();
    expect(resolveGoal(null, { energyKcal: 2000, proteinG: 80, fatG: 60, carbohydrateG: 250 })?.energyKcal).toBe(2000);
    expect(resolveGoal(profile, { proteinG: 100 })?.proteinG).toBe(100);
  });
  it("guesses the meal from the hour", () => {
    expect([7, 12, 19, 2].map(guessMealType)).toEqual(["breakfast", "lunch", "dinner", "snack"]);
  });
});
