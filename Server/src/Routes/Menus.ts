/** Read-only chain and menu endpoints, and the not-found request endpoints. */
import { Hono } from "hono";
import { MenuRequestInputSchema } from "@nutri/shared";
import { getMenuRequestStatuses, listChains, recordMenuRequest, searchMenuItems } from "../Db/MenuQueries";
import { limitRate } from "../Middleware/LimitRate";
import { requireInstallation } from "../Middleware/RequireInstallation";
import type { AppEnv } from "../Types";

export const menuRoutes = new Hono<AppEnv>();

menuRoutes.get("/chains", async (c) => c.json(await listChains(c.env.DB)));

menuRoutes.get("/menus", async (c) => {
  const q = c.req.query("q")?.trim();
  if (!q) return c.json({ error: "q is required" }, 400);
  return c.json(await searchMenuItems(c.env.DB, q, c.req.query("chain")?.trim() || undefined));
});

menuRoutes.post("/menu-requests", requireInstallation, limitRate, async (c) => {
  const parsed = MenuRequestInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid body" }, 400);
  const requestId = await recordMenuRequest(c.env.DB, parsed.data.chainName, parsed.data.menuName);
  return c.json({ requestId }, 201);
});

menuRoutes.get("/menu-requests", async (c) => {
  const ids = (c.req.query("ids") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 100);
  return c.json(await getMenuRequestStatuses(c.env.DB, ids));
});
