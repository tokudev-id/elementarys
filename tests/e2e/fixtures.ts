import { test as base } from "@playwright/test";
import { Pool } from "pg";
import { assertLocalTestDatabase } from "../../src/server/db/safety";
export { expect, type Page } from "@playwright/test";

export const test = base.extend<{ loginWindow: void }>({
  loginWindow: [
    async ({ baseURL }, use) => {
      if (!baseURL || !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname))
        throw new Error("Browser fixtures require a local application.");
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error("Database uji wajib tersedia.");
      assertLocalTestDatabase(url);
      const source = new Pool({ connectionString: url, max: 1 });
      try {
        // Shared synthetic accounts would exhaust the login limit across unrelated tests.
        await source.query("DELETE FROM rate_limit");
      } finally {
        await source.end();
      }
      await use();
    },
    { auto: true },
  ],
});
