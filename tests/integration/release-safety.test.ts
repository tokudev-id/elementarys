import { beforeAll, afterAll, it, expect } from "vitest";
import type { Pool } from "pg";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { createTestDatabase } from "./harness";
let source: Pool;
let url: string;
beforeAll(async () => {
  const database = await createTestDatabase("release_safety");
  source = database.pool;
  url = database.url;
}, 30000);
afterAll(async () => {
  await source?.end();
});
it.each([
  "scripts/seed.ts",
  "scripts/migrate.ts",
  "scripts/bootstrap-admin.ts",
  "scripts/release/migrate.ts",
  "scripts/release/bootstrap.ts",
])(
  "CLI %s refuses unconfirmed production configuration before database writes",
  async (script) => {
    const password = `Synthetic-${randomUUID()}`;
    const result = await promisify(execFile)(
      process.execPath,
      ["--conditions=react-server", "--import", "tsx", script],
      {
        env: {
          ...process.env,
          APP_ENV: "production",
          DATABASE_URL: url,
          DATABASE_MIGRATION_URL: url,
          BETTER_AUTH_SECRET: randomUUID(),
          BETTER_AUTH_URL: "https://synthetic.example.test",
          BOOTSTRAP_EMAIL: "operator@example.test",
          BOOTSTRAP_NAME: "Synthetic Operator",
          BOOTSTRAP_PASSWORD: password,
          TEST_ACCOUNT_PASSWORD: password,
          RELEASE_MANIFEST_FILE: ".local/nonexistent-manifest.json",
          RELEASE_CONFIRM: "",
          RELEASE_ENV_FILE: ".local/nonexistent-release.env",
        },
        windowsHide: true,
      },
    ).then(
      () => ({ failed: false, output: "" }),
      (error: { stdout?: string; stderr?: string }) => ({
        failed: true,
        output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
      }),
    );
    expect(result.failed).toBe(true);
    expect(result.output).not.toContain(password);
    expect((await source.query('SELECT count(*)::int n FROM "user"')).rows[0].n).toBe(0);
    expect((await source.query("SELECT count(*)::int n FROM students")).rows[0].n).toBe(0);
  },
  30000,
);
