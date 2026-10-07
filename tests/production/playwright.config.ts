import { defineConfig } from "@playwright/test";
import base from "../../playwright.config";
const port = process.env.PORT ?? "3101";
export default defineConfig({ ...base, testDir: ".", testMatch: "preview.spec.ts", webServer: { command: `pnpm start --hostname 127.0.0.1 --port ${port}`, cwd: process.cwd(), url: `http://127.0.0.1:${port}`, reuseExistingServer: false } });
