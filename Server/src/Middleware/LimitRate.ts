/** Daily rate limit per installation ID and per IP, backed by D1. */
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../Types";

async function hashKey(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function incrementCount(db: D1Database, key: string, day: string): Promise<number> {
  const row = await db.prepare("INSERT INTO rate_limits (key_hash, day, count) VALUES (?, ?, 1) ON CONFLICT(key_hash, day) DO UPDATE SET count = count + 1 RETURNING count").bind(key, day).first<{ count: number }>();
  return row?.count ?? 0;
}

export const limitRate = createMiddleware<AppEnv>(async (c, next) => {
  const limit = Number(c.env.POST_DAILY_LIMIT) || 30;
  const day = new Date().toISOString().slice(0, 10);
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  const installationKey = await hashKey(`install:${c.get("installationId")}`);
  const ipKey = await hashKey(`ip:${ip}`);

  const installationCount = await incrementCount(c.env.DB, installationKey, day);
  // IPs are shared by many users behind NAT, so the IP cap is looser.
  const ipCount = await incrementCount(c.env.DB, ipKey, day);
  if (installationCount > limit || ipCount > limit * 10) {
    return c.json({ error: "rate limit exceeded" }, 429);
  }
  await next();
});
