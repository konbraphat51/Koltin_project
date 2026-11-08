/** Worker entry: wires the `/v1` routes. */
import { Hono } from "hono";
import { menuRoutes } from "./Routes/Menus";
import { offRoutes } from "./Routes/Off";
import type { AppEnv } from "./Types";

export const app = new Hono<AppEnv>();

app.get("/", (c) => c.json({ name: "nutri-server", status: "ok" }));
app.route("/v1", menuRoutes);
app.route("/v1", offRoutes);
app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "internal error" }, 500);
});

export default app;
