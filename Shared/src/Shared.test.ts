import { describe, expect, it } from "vitest";
import { normalizeText, scaleNutrients, sumNutrients, NutrientsSchema } from "./Index";

describe("normalizeText", () => {
  it("applies NFKC, lowercase and whitespace collapse", () => {
    expect(normalizeText("  ＭｃＤｏｎａｌｄ’ｓ   ビッグ　マック ")).toBe("mcdonald’s ビッグ マック");
  });
});

describe("nutrients", () => {
  const base = { energyKcal: 200, proteinG: 10, fatG: 5, carbohydrateG: 30, fiberG: 2, saltG: 1 };
  it("scales per 100 g", () => {
    expect(scaleNutrients(base, 150).energyKcal).toBe(300);
  });
  it("sums", () => {
    expect(sumNutrients([base, base]).proteinG).toBe(20);
  });
  it("rejects negatives", () => {
    expect(NutrientsSchema.safeParse({ ...base, fatG: -1 }).success).toBe(false);
  });
});
