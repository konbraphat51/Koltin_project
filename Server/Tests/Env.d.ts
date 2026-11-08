import type { D1Migration } from "@cloudflare/vitest-pool-workers/config";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
    TEST_MIGRATIONS: D1Migration[];
    OFF_BASE_URL: string;
    OFF_USER_ID: string;
    OFF_PASSWORD: string;
    POST_DAILY_LIMIT: string;
  }
}
