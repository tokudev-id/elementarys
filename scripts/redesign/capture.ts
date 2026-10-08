import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { config } from "dotenv";
import { Pool } from "pg";
import { assertLocalTestDatabase } from "../../src/server/db/safety";
import { schoolToday } from "../../src/domain/calendar";

config({ path: ".env.local", quiet: true });
const stage = process.argv[2];
if (stage !== "before" && stage !== "after") throw new Error("Pilih stage before atau after.");
const url = process.env.DATABASE_URL;
const password = process.env.DEMO_ACCOUNT_PASSWORD;
if (!url || !password) throw new Error("Database dan credential demo lokal wajib tersedia.");
assertLocalTestDatabase(url);
const base = new URL(process.env.REDESIGN_BASE_URL ?? "http://localhost:3101");
if (base.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(base.hostname))
  throw new Error("Screenshot hanya untuk aplikasi lokal sintetis.");
const output = resolve("docs/redesign", stage);
await mkdir(output, { recursive: true });
const source = new Pool({ connectionString: url, max: 1 });
const browser = await chromium.launch();
try {
  const year = (await source.query("SELECT id FROM academic_years WHERE is_current")).rows[0].id;
  const classId = (
    await source.query("SELECT id FROM classes WHERE academic_year_id=$1 ORDER BY grade LIMIT 1", [
      year,
    ])
  ).rows[0].id;
  const studentId = (await source.query("SELECT id FROM students ORDER BY student_code LIMIT 1"))
    .rows[0].id;
  const timezone = (await source.query("SELECT timezone FROM school_config")).rows[0].timezone;
  const date = schoolToday(timezone);
  const query = `yearId=${year}&classId=${classId}&month=${date.slice(0, 7)}`;
  const routes = [
    ["beranda", "/"],
    ["absensi", "/attendance"],
    ["catat-absensi", `/attendance/${classId}?date=${date}`],
    ["riwayat-absensi", `/attendance/${classId}/history?date=${date}`],
    ["rekap", `/reports?${query}`],
    ["cetak", `/reports/print?${query}`],
    ["siswa", "/students"],
    ["detail-siswa", `/students/${studentId}`],
    ["naik-kelas", `/students/promote?classId=${classId}`],
    ["guru", "/teachers"],
    ["kelas", `/classes?yearId=${year}`],
    ["tahun-ajaran", "/academic-years"],
    ["persiapan-tahun", `/academic-years/rollover?yearId=${year}`],
    ["kalender", `/calendar?yearId=${year}&month=${date.slice(0, 7)}`],
    ["pengaturan", "/settings"],
    ["persiapan", "/setup"],
    ["audit", "/audit"],
    ["password", stage === "after" ? "/account/password" : "/change-password"],
  ];
  const page = await browser.newPage();
  await page.goto(new URL("/login", base).toString());
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: resolve(output, `login-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
  }
  await page.getByLabel("Email", { exact: true }).fill("dewi.lestari@sdharapan.example");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL((value) => value.pathname !== "/login");
  for (const [name, route] of routes) {
    await page.goto(new URL(route, base).toString());
    await page.waitForLoadState("networkidle");
    await page.locator("main").last().waitFor();
    for (const width of [360, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        window.scrollTo(0, 0);
      });
      await page.screenshot({
        path: resolve(output, `${name}-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
    }
  }
  console.log(`Screenshot ${stage}: ${(routes.length + 1) * 2} capture sintetis.`);
} finally {
  await browser.close();
  await source.end();
}
