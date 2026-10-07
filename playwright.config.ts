import { defineConfig } from "@playwright/test";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
if (process.env.APP_ENV === "test") {
  const url = new URL(
    process.env.DATABASE_URL ?? "postgresql://school_test@127.0.0.1:55433/elementary_test_dev",
  );
  url.pathname = `/elementary_test_${process.env.TEST_DB_SUFFIX ?? "e2e"}_app`;
  process.env.DATABASE_URL = url.toString();
}
const port = process.env.PORT ?? "3101";
if (process.env.APP_ENV === "test") process.env.BETTER_AUTH_URL = `http://localhost:${port}`;
export default defineConfig({
  testDir: "./tests/e2e",
  // These flows edit the same school configuration and seed accounts.
  workers: 1,
  globalSetup: "./tests/e2e/setup.ts",
  use: {
    baseURL: `http://localhost:${port}`,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROME_PATH,
    },
  },
  webServer: {
    command: `pnpm start --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
