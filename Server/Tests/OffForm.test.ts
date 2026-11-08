import { describe, expect, it } from "vitest";
import { buildOffProductForm } from "../src/Routes/Off";

describe("buildOffProductForm", () => {
  it("maps nutrients to OFF fields per 100 g", () => {
    const form = buildOffProductForm(
      { barcode: "4901234567894", name: "Cookie", brand: "Acme", servingG: 30, nutrients: { energyKcal: 480, proteinG: 6, fatG: 22, carbohydrateG: 64, fiberG: 2, saltG: 0.5 } },
      "user",
      "pw",
    );
    expect(form.get("code")).toBe("4901234567894");
    expect(form.get("nutrition_data_per")).toBe("100g");
    expect(form.get("nutriment_energy-kcal")).toBe("480");
    expect(form.get("nutriment_carbohydrates")).toBe("64");
    expect(form.get("brands")).toBe("Acme");
    expect(form.get("serving_size")).toBe("30 g");
  });
});
