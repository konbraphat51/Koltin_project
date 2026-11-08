/** Validates the structured JSON that the LLM returns for a product label. */
import { NutrientsSchema } from "@nutri/shared";
import { z } from "zod";

export const ExtractedProductSchema = z.object({
  name: z.string(),
  brand: z.string(),
  servingG: z.number().positive().nullable(),
  ingredientsText: z.string(),
  per100g: NutrientsSchema,
});

export type ExtractedProduct = z.infer<typeof ExtractedProductSchema>;

/** JSON schema sent to the LLM (strict structured output); mirrors ExtractedProductSchema. */
export const extractedProductJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "brand", "servingG", "ingredientsText", "per100g"],
  properties: {
    name: { type: "string" },
    brand: { type: "string" },
    servingG: { type: ["number", "null"] },
    ingredientsText: { type: "string" },
    per100g: {
      type: "object",
      additionalProperties: false,
      required: ["energyKcal", "proteinG", "fatG", "carbohydrateG", "fiberG", "saltG"],
      properties: {
        energyKcal: { type: "number" },
        proteinG: { type: "number" },
        fatG: { type: "number" },
        carbohydrateG: { type: "number" },
        fiberG: { type: "number" },
        saltG: { type: "number" },
      },
    },
  },
} as const;

/** Parses the LLM message content; throws if it is not valid. */
export function parseLlmProduct(content: string): ExtractedProduct {
  const result = ExtractedProductSchema.safeParse(JSON.parse(content));
  if (!result.success) throw new Error("LLM returned an unexpected shape");
  return result.data;
}
