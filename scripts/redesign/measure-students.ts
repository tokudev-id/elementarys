import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { config } from "dotenv";
import { chromium } from "@playwright/test";
import { createTestDatabase } from "../../tests/integration/harness";
import { seedTestDatabase } from "../../src/server/db/seed";

config({ path: ".env.local", quiet: true });
const stage = process.argv[2];
if (stage !== "before" && stage !== "after") throw new Error("Pilih before atau after.");
const db = await createTestDatabase("ui_r2_measure");
const password = randomBytes(24).toString("base64url");
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3104"],
  {
    env: {
      ...process.env,
      APP_ENV: "test",
      DATABASE_URL: db.url,
      BETTER_AUTH_URL: "http://localhost:3104",
      TRUSTED_ORIGINS: "http://localhost:3104",
    },
    windowsHide: true,
    stdio: "ignore",
  },
);
const browser = await chromium.launch();
try {
  const seed = await seedTestDatabase(db.url, password, "test", { pilot: true });
  for (let index = 1; index <= 540; index++) {
    const student = (
      await db.pool.query(
        "INSERT INTO students(student_code,full_name) VALUES('M-'||nextval('student_code_seq'),$1) RETURNING id",
        [`Nama skala ${String(index).padStart(4, "0")}`],
      )
    ).rows[0].id;
    await db.pool.query(
      "INSERT INTO enrollments(student_id,class_id,starts_on,ends_on_exclusive) VALUES($1,$2,'2026-01-01','2027-01-01')",
      [student, seed.classIds[(index - 1) % 6]],
    );
  }
  let ready = false;
  for (let index = 0; index < 50; index++) {
    try {
      if ((await fetch("http://localhost:3104/api/health")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error("Server ukur belum siap.");
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const login = await context.request.post("http://localhost:3104/api/auth/sign-in/email", {
    headers: { Origin: "http://localhost:3104" },
    data: { email: "admin@example.test", password },
  });
  if (login.status() !== 200) throw new Error("Login ukur gagal.");
  const samples = [];
  for (let index = 0; index < 6; index++) {
    const started = performance.now();
    const response = await context.request.get("http://localhost:3104/students");
    if (response.status() !== 200) throw new Error("Halaman ukur gagal.");
    await response.body();
    if (index) samples.push(Number((performance.now() - started).toFixed(2)));
  }
  const page = await context.newPage();
  await page.goto("http://localhost:3104/students");
  await page.getByRole("heading", { name: "Siswa", exact: true }).waitFor();
  const rendered = Math.max(
    await page.locator(".resource-list > li").count(),
    await page.locator(".data-table tbody tr").count(),
    await page.locator(".mobile-card-list > li").count(),
  );
  const sorted = [...samples].sort((a, b) => a - b);
  const result = {
    stage,
    timestamp: new Date().toISOString(),
    students: 600,
    rendered,
    samples,
    medianMs: sorted[2],
    environment: "local PostgreSQL18, Next production build in test mode, synthetic data",
  };
  await writeFile(`docs/redesign/students-${stage}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  server.kill();
  await browser.close();
  await db.pool.end();
}
