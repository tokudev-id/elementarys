import { defineConfig } from "@playwright/test";
const port = process.env.PORT ?? "3101";
export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: `http://127.0.0.1:${port}`, launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROME_PATH,
  } },
  webServer: { command: `pnpm start --hostname 127.0.0.1 --port ${port}`, url: `http://127.0.0.1:${port}`, reuseExistingServer: !process.env.CI },
});
