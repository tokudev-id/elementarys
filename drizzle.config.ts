import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./src/server/db/migrations",
  dbCredentials: {
    url:
      process.env.DATABASE_MIGRATION_URL ??
      "postgresql://school_test@127.0.0.1:55433/elementary_test_dev",
  },
});
