import { test, expect } from "./fixtures";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { assertLocalTestDatabase } from "../../src/server/db/safety";
import { expectNoPageOverflow } from "./helpers/mobile";

let source: Pool;
test.beforeAll(() => {
  assertLocalTestDatabase(process.env.DATABASE_URL!);
  source = new Pool({ connectionString: process.env.DATABASE_URL });
});
test.afterAll(async () => {
  await source?.end();
});

test("print snapshot, receipt and A4 landscape PDF give one page per 10-student class", async ({
  page,
}) => {
  const yearId = (
    await source.query(
      "INSERT INTO academic_years(label,starts_on,ends_on_exclusive) VALUES('Tahun Cetak Sintetis','2024-01-01','2025-01-01') RETURNING id",
    )
  ).rows[0].id;
  await source.query("INSERT INTO school_weekdays SELECT $1,generate_series(1,5)", [yearId]);
  for (let grade = 1; grade <= 2; grade++) {
    const classId = (
      await source.query(
        "INSERT INTO classes(academic_year_id,grade,name) VALUES($1,$2,$3) RETURNING id",
        [yearId, grade, `Kelas Cetak ${grade}`],
      )
    ).rows[0].id;
    for (let index = 1; index <= 10; index++) {
      const student = (
        await source.query(
          "INSERT INTO students(student_code,full_name) VALUES($1,$2) RETURNING id",
          [`C-${randomUUID()}`, `Siswa Cetak ${index}`],
        )
      ).rows[0].id;
      await source.query(
        "INSERT INTO enrollments(student_id,class_id,starts_on,ends_on_exclusive) VALUES($1,$2,'2024-01-01','2025-01-01')",
        [student, classId],
      );
    }
  }
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("guru@example.test");
  await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();
  const count = async () =>
    (
      await source.query(
        "SELECT count(*)::int n FROM report_exports WHERE academic_year_id=$1 AND format='print'",
        [yearId],
      )
    ).rows[0].n;
  const before = await count();
  await page.goto(`/reports/print?yearId=${yearId}&month=2024-10`);
  await expect(page.locator(".print-class")).toHaveCount(2);
  expect(await count()).toBe(before);
  for (const width of [360, 768, 1024]) {
    await page.setViewportSize({ width, height: 800 });
    await expectNoPageOverflow(page);
  }
  await page.evaluate(() => {
    window.print = () => {
      document.documentElement.dataset.printRequested = "true";
    };
  });
  await page.getByRole("button", { name: "Cetak", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-print-requested", "true");
  expect(await count()).toBe(before + 1);
  const pdf = await page.pdf({
    path: "test-results/rekap-a4.pdf",
    preferCSSPageSize: true,
    printBackground: true,
  });
  const content = pdf.toString("latin1");
  await page.emulateMedia({ media: "print" });
  expect(
    await page.locator("body").evaluate((element) => getComputedStyle(element).backgroundColor),
  ).toBe("rgb(255, 255, 255)");
  await page.setViewportSize({ width: 1123, height: 794 });
  await page.screenshot({ path: "test-results/print-report.png", fullPage: true });
  expect(content.match(/\/Type\s*\/Page\b/g)).toHaveLength(2);
  const box = content.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/);
  expect(box).not.toBeNull();
  expect(Number(box![1])).toBeGreaterThan(Number(box![2]));
});

test("print requires authentication and trusted Origin", async ({ request }) => {
  expect(
    (
      await request.post("/api/reports/exports", {
        headers: { Origin: process.env.BETTER_AUTH_URL! },
        data: {},
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/reports/exports", {
        headers: { Origin: "http://untrusted.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
});
