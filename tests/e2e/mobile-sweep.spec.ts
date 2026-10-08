import { test, expect } from "./fixtures";
import { Pool } from "pg";
import { assertLocalTestDatabase } from "../../src/server/db/safety";
import { schoolToday } from "../../src/domain/calendar";
import { mobileViewports, expectNoPageOverflow, expectTouchTarget } from "./helpers/mobile";
test("all pages reflow across portrait/landscape, touch targets and reduced keyboard viewport", async ({
  page,
}) => {
  test.setTimeout(180000);
  assertLocalTestDatabase(process.env.DATABASE_URL!);
  const source = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const year = (await source.query("SELECT id FROM academic_years WHERE is_current")).rows[0].id;
    const classId = (
      await source.query(
        "SELECT id FROM classes WHERE academic_year_id=$1 ORDER BY grade LIMIT 1",
        [year],
      )
    ).rows[0].id;
    const student = (
      await source.query("SELECT student_id id FROM enrollments WHERE class_id=$1 LIMIT 1", [
        classId,
      ])
    ).rows[0].id;
    const date = schoolToday(
      (await source.query("SELECT timezone FROM school_config")).rows[0].timezone,
    );
    const query = `yearId=${year}&classId=${classId}&month=${date.slice(0, 7)}`;
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
    await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const routes = [
      "/attendance",
      `/attendance/${classId}?date=${date}`,
      `/attendance/${classId}/history?date=${date}`,
      `/reports?${query}`,
      `/reports/print?${query}`,
      "/academic-years",
      `/academic-years/rollover?yearId=${year}`,
      `/classes?yearId=${year}`,
      `/calendar?yearId=${year}&month=${date.slice(0, 7)}`,
      "/students",
      `/students/${student}`,
      `/students/promote?classId=${classId}`,
      "/teachers",
      "/settings",
      "/setup",
      "/audit",
      "/change-password",
    ];
    for (const [index, route] of routes.entries()) {
      await page.goto(route);
      await expect(page.locator("main h1").first()).toBeVisible();
      for (const viewport of mobileViewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await expectNoPageOverflow(page);
        await expectTouchTarget(
          page,
          "button, .status-choices span, .checkbox-field input, summary, a[href]",
        );
      }
      await page.setViewportSize({ width: 360, height: 340 });
      const field = page
        .locator(
          'main input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not(:disabled)',
        )
        .first();
      if (await field.count()) {
        await field.focus();
        await field.evaluate((element) => element.scrollIntoView({ block: "center" }));
        await expect(field).toBeInViewport();
        expect(
          await field.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return rect.top >= 0 && rect.bottom <= window.innerHeight;
          }),
        ).toBe(true);
      }
      await expectNoPageOverflow(page);
      await page.setViewportSize({ width: 360, height: 800 });
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        window.scrollTo(0, 0);
      });
      await page.screenshot({ path: `test-results/sweep-${index}-360.png` });
    }
    expect(errors).toEqual([]);
    await page.goto("/students/not-a-valid-id");
    await expect(
      page.getByRole("heading", { name: "Halaman belum dapat dimuat", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Muat ulang halaman", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Halaman belum dapat dimuat", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Kembali ke hari ini", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();
  } finally {
    await source.end();
  }
});
