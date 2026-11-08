/** Extracts nutrition facts from product photos with the OpenAI API, using the user's own key. */
import { extractedProductJsonSchema, parseLlmProduct, type ExtractedProduct } from "../domain/ParserLlmProduct";
import { defaultFetch, type FetchFn } from "./ClientOpenFoodFacts";

/** Provider-neutral interface so the LLM provider can be swapped. */
export interface ClientLlm {
  extractProduct(imagesBase64: string[]): Promise<ExtractedProduct>;
}

export type LlmErrorKind = "invalidKey" | "rateLimited" | "failed";

export class LlmError extends Error {
  constructor(
    readonly kind: LlmErrorKind,
    message: string,
  ) {
    super(message);
  }
}

const instructions = [
  "You read photos of a food product (front, nutrition facts label, ingredients list) and return its data as JSON.",
  "Nutrients must be per 100 g (or per 100 ml for drinks). If the label gives values per serving, convert them using the serving size.",
  "salt: if the label shows sodium (mg) instead of salt equivalent, use sodium_mg * 2.54 / 1000 grams.",
  "Use 0 for nutrients that are not printed. servingG is the grams per serving, or null if unknown.",
  "name and brand should be written as printed (Japanese stays Japanese). Return an empty string when unknown.",
].join("\n");

export class ClientOpenAi implements ClientLlm {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetchFn: FetchFn = defaultFetch,
  ) {}

  async extractProduct(imagesBase64: string[]): Promise<ExtractedProduct> {
    const response = await this.fetchFn("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: instructions },
          {
            role: "user",
            content: [{ type: "text", text: "Extract the product data from these photos." }, ...imagesBase64.map((data) => ({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${data}` } }))],
          },
        ],
        response_format: { type: "json_schema", json_schema: { name: "product_nutrition", strict: true, schema: extractedProductJsonSchema } },
      }),
    });

    if (response.status === 401) throw new LlmError("invalidKey", "OpenAI rejected the API key");
    if (response.status === 429) throw new LlmError("rateLimited", "OpenAI rate limit or quota exceeded");
    if (!response.ok) throw new LlmError("failed", `OpenAI error ${response.status}`);

    const body = (await response.json()) as { choices?: { message?: { content?: string | null } }[] };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new LlmError("failed", "OpenAI returned no content");
    try {
      return parseLlmProduct(content);
    } catch {
      throw new LlmError("failed", "OpenAI returned an unexpected result");
    }
  }
}
