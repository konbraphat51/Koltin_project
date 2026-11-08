/** Request and response schemas of the Server API (`/v1`). */
import { z } from "zod";
import { NutrientsSchema } from "./Nutrients";

export const ChainSchema = z.object({ id: z.number().int(), name: z.string() });
export type Chain = z.infer<typeof ChainSchema>;

export const MenuItemSchema = z.object({
  id: z.number().int(),
  chainId: z.number().int(),
  chainName: z.string(),
  name: z.string(),
  servingG: z.number().positive().nullable(),
  /** Nutrients per serving. */
  nutrients: NutrientsSchema,
  sourceUrl: z.string().nullable(),
});
export type MenuItem = z.infer<typeof MenuItemSchema>;

export const MenuRequestInputSchema = z.object({
  chainName: z.string().trim().min(1).max(100),
  menuName: z.string().trim().min(1).max(100),
});
export type MenuRequestInput = z.infer<typeof MenuRequestInputSchema>;

export const MenuRequestCreatedSchema = z.object({ requestId: z.number().int() });

export const MenuRequestStatusSchema = z.object({
  requestId: z.number().int(),
  status: z.enum(["open", "resolved", "rejected"]),
  menuItem: MenuItemSchema.nullable(),
});
export type MenuRequestStatus = z.infer<typeof MenuRequestStatusSchema>;

export const OffProductInputSchema = z.object({
  barcode: z.string().regex(/^\d{8,14}$/),
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().max(100).optional(),
  ingredientsText: z.string().max(2000).optional(),
  servingG: z.number().positive().optional(),
  /** Nutrients per 100 g. */
  nutrients: NutrientsSchema,
});
export type OffProductInput = z.infer<typeof OffProductInputSchema>;

/** Header carrying the random installation ID. */
export const installationHeader = "X-Installation-Id";
