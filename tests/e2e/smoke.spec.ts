import { test, expect } from "./fixtures";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Pool } from "pg";
import { assertLocalTestDatabase } from "../../src/server/db/safety";
test("release smoke only reads public health/login and unauthenticated guard", async () => {
  assertLocalTestDatabase(process.env.DATABASE_URL!);
  const source = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const query =
      "SELECT (SELECT count(*)::int FROM students) students,(SELECT count(*)::int FROM attendance_sessions) sessions,(SELECT count(*)::int FROM audit_events) audits";
    const before = (await source.query(query)).rows[0];
    const result = await promisify(execFile)(
      process.execPath,
      ["--import", "tsx", "scripts/release/smoke.ts"],
      {
        env: {
          ...process.env,
          SMOKE_BASE_URL: process.env.BETTER_AUTH_URL!,
          SMOKE_AUTH_COOKIE: "",
          RELEASE_ENV_FILE: ".local/nonexistent-release.env",
        },
        windowsHide: true,
      },
    );
    expect(result.stdout).toContain("Smoke read-only lulus");
    expect((await source.query(query)).rows[0]).toEqual(before);
  } finally {
    await source.end();
  }
});
