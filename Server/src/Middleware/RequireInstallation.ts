/** Requires a well-formed installation ID header on the request. */
import { createMiddleware } from "hono/factory";
import { installationHeader } from "@nutri/shared";
import type { AppEnv } from "../Types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const requireInstallation = createMiddleware<AppEnv>(async (c, next) => {
  const id = c.req.header(installationHeader);
  if (!id || !uuidPattern.test(id)) {
    return c.json({ error: "missing or invalid installation id" }, 400);
  }
  c.set("installationId", id.toLowerCase());
  await next();
});
