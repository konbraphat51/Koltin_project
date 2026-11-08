/** Relays product contributions to Open Food Facts using the shared app account. */
import { Hono } from "hono";
import { OffProductInputSchema, type OffProductInput } from "@nutri/shared";
import { limitRate } from "../Middleware/LimitRate";
import { requireInstallation } from "../Middleware/RequireInstallation";
import type { AppEnv, Bindings } from "../Types";

export const offRoutes = new Hono<AppEnv>();

const userAgent = "NutriApp/0.1 (https://github.com/konbraphat51)";

/** Builds the form body of the OFF product write API. */
export function buildOffProductForm(input: OffProductInput, userId: string, password: string): URLSearchParams {
  const form = new URLSearchParams({
    user_id: userId,
    password,
    action: "process",
    json: "1",
    code: input.barcode,
    product_name: input.name,
    nutrition_data_per: "100g",
    "nutriment_energy-kcal": String(input.nutrients.energyKcal),
    "nutriment_energy-kcal_unit": "kcal",
    nutriment_proteins: String(input.nutrients.proteinG),
    nutriment_fat: String(input.nutrients.fatG),
    nutriment_carbohydrates: String(input.nutrients.carbohydrateG),
    nutriment_fiber: String(input.nutrients.fiberG),
    nutriment_salt: String(input.nutrients.saltG),
  });
  if (input.brand) form.set("brands", input.brand);
  if (input.ingredientsText) form.set("ingredients_text", input.ingredientsText);
  if (input.servingG) form.set("serving_size", `${input.servingG} g`);
  return form;
}

function getCredentials(env: Bindings): { userId: string; password: string } | null {
  if (!env.OFF_USER_ID || !env.OFF_PASSWORD) return null;
  return { userId: env.OFF_USER_ID, password: env.OFF_PASSWORD };
}

offRoutes.post("/off/products", requireInstallation, limitRate, async (c) => {
  const credentials = getCredentials(c.env);
  if (!credentials) return c.json({ error: "off relay is not configured" }, 503);
  const parsed = OffProductInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid body" }, 400);

  const response = await fetch(`${c.env.OFF_BASE_URL}/cgi/product_jqm2.pl`, {
    method: "POST",
    headers: { "User-Agent": userAgent },
    body: buildOffProductForm(parsed.data, credentials.userId, credentials.password),
  });
  return c.json({ ok: response.ok }, response.ok ? 200 : 502);
});

const maxImageBytes = 5 * 1024 * 1024;
const allowedImageFields = new Set(["front", "ingredients", "nutrition"]);

offRoutes.post("/off/images", requireInstallation, limitRate, async (c) => {
  const credentials = getCredentials(c.env);
  if (!credentials) return c.json({ error: "off relay is not configured" }, 503);

  const body = await c.req.parseBody().catch(() => null);
  const barcode = body?.["barcode"];
  const imageField = body?.["imagefield"];
  const file = body?.["file"];
  const isValid = typeof barcode === "string" && /^\d{8,14}$/.test(barcode) && typeof imageField === "string" && allowedImageFields.has(imageField) && file instanceof File && file.size <= maxImageBytes && file.type.startsWith("image/");
  if (!isValid) return c.json({ error: "invalid body" }, 400);

  const form = new FormData();
  form.set("user_id", credentials.userId);
  form.set("password", credentials.password);
  form.set("code", barcode);
  form.set("imagefield", imageField);
  form.set(`imgupload_${imageField}`, file, "image.jpg");
  const response = await fetch(`${c.env.OFF_BASE_URL}/cgi/product_image_upload.pl`, {
    method: "POST",
    headers: { "User-Agent": userAgent },
    body: form,
  });
  return c.json({ ok: response.ok }, response.ok ? 200 : 502);
});
