/** Worker bindings and Hono context types. */

export type Bindings = {
  DB: D1Database;
  OFF_BASE_URL: string;
  OFF_USER_ID: string;
  OFF_PASSWORD?: string;
  POST_DAILY_LIMIT: string;
};

export type Variables = {
  installationId: string;
};

export type AppEnv = { Bindings: Bindings; Variables: Variables };
