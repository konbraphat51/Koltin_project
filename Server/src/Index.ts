/** Worker entry: wires the `/v1` routes. */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { menuRoutes } from "./Routes/Menus";
import { offRoutes } from "./Routes/Off";
import type { AppEnv } from "./Types";

export const app = new Hono<AppEnv>();

// Public, cookie-less API: any origin may call it (needed by web builds; native apps ignore CORS).
app.use("*", cors({ origin: "*", allowHeaders: ["Content-Type", "X-Installation-Id"], allowMethods: ["GET", "POST", "OPTIONS"] }));
app.get("/", (c) => c.json({ name: "nutri-server", status: "ok" }));
app.route("/v1", menuRoutes);
app.route("/v1", offRoutes);
app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "internal error" }, 500);
});

export default app;
