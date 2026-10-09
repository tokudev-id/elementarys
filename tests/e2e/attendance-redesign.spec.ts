import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { schoolToday } from "../../src/domain/calendar";
import { assertLocalTestDatabase } from "../../src/server/db/safety";
import { test, expect } from "./fixtures";
import { expectNoPageOverflow } from "./helpers/mobile";
test.use({ hasTouch: true });

test("30 pupils and three absences take five taps with a complete named confirmation", async ({
  page,
}) => {
  test.setTimeout(60000);
  assertLocalTestDatabase(process.env.DATABASE_URL!);
  const source = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const year = (await source.query("SELECT id FROM academic_years WHERE is_current")).rows[0].id;
    const today = schoolToday(
      (await source.query("SELECT timezone FROM school_config")).rows[0].timezone,
    );
    await source.query(
      "INSERT INTO school_day_overrides(academic_year_id,date,is_school_day,reason) VALUES($1,$2,true,'Skenario UI sintetis') ON CONFLICT(academic_year_id,date) DO UPDATE SET is_school_day=true",
      [year, today],
    );
    const classId = (
      await source.query(
        "INSERT INTO classes(academic_year_id,grade,name) VALUES($1,4,$2) RETURNING id",
        [year, `Kelas 30 ${randomUUID().slice(0, 8)}`],
      )
    ).rows[0].id;
    for (let index = 1; index <= 30; index++) {
      const studentId = (
        await source.query(
          "INSERT INTO students(student_code,full_name) VALUES('S-'||nextval('student_code_seq'),$1) RETURNING id",
          [`Nama siswa ${String(index).padStart(2, "0")}`],
        )
      ).rows[0].id;
      await source.query(
        "INSERT INTO enrollments(student_id,class_id,starts_on,ends_on_exclusive) SELECT $1,$2,starts_on,ends_on_exclusive FROM academic_years WHERE id=$3",
        [studentId, classId, year],
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill("guru@example.test");
    await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();
    await page.goto(`/attendance/${classId}?date=${today}`);
    const rows = page.getByTestId("student-row");
    await expect(rows).toHaveCount(30);
    await expect(rows.locator('input[value="H"]:checked')).toHaveCount(30);
    expect(
      (
        await source.query(
          "SELECT count(*)::int n FROM attendance_records WHERE session_id IN (SELECT id FROM attendance_sessions WHERE class_id=$1)",
          [classId],
        )
      ).rows[0].n,
    ).toBe(0);
    await page.evaluate(() => {
      document.documentElement.dataset.tapCount = "0";
      document.addEventListener("pointerup", () => {
        document.documentElement.dataset.tapCount = String(
          Number(document.documentElement.dataset.tapCount) + 1,
        );
      });
    });
    for (const [index, status] of ["S", "I", "A"].entries())
      await rows.nth(index).locator(`label[data-status="${status}"]`).tap();
    await expectNoPageOverflow(page);
    const heights = await rows.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().height),
    );
    expect(Math.max(...heights)).toBeLessThanOrEqual(96);
    // UI-F4 (A16): No nested scroll - roster flows naturally with page
    const scroller = await page
      .getByRole("region", { name: "Daftar siswa dan status kehadiran" })
      .evaluate((element) => ({ client: element.clientHeight, scroll: element.scrollHeight }));
    expect(scroller.scroll).toBe(scroller.client);
    // UI-F4 (A16): At least 6 pupil rows visible in 390x844 without scrolling
    for (let i = 0; i < 6; i++) {
      await expect(rows.nth(i)).toBeInViewport();
    }
    await page.getByRole("button", { name: "Simpan absensi", exact: true }).tap();
    const confirmation = page.getByRole("dialog");
    for (const name of ["Nama siswa 01", "Nama siswa 02", "Nama siswa 03"])
      await expect(confirmation.getByText(name, { exact: true })).toBeVisible();
    await expect(confirmation.getByText("27 Hadir", { exact: true })).toBeVisible();
    await expect(
      confirmation.getByText("Siswa lain dicatat Hadir.", { exact: true }),
    ).toBeVisible();
    await confirmation.getByRole("button", { name: "Simpan", exact: true }).tap();
    await expect(page.getByText("Tersimpan", { exact: true })).toBeVisible();
    const toast = page.locator("[data-sonner-toast]").first();
    await expect(toast).toBeVisible();
    const toastBox = await toast.boundingBox();
    expect(toastBox!.x).toBeGreaterThanOrEqual(0);
    expect(toastBox!.x + toastBox!.width).toBeLessThanOrEqual(390);
    expect(Number(await page.locator("html").getAttribute("data-tap-count"))).toBe(5);
    const totals = (
      await source.query(
        "SELECT status,count(*)::int n FROM attendance_records WHERE session_id IN (SELECT id FROM attendance_sessions WHERE class_id=$1) GROUP BY status ORDER BY status",
        [classId],
      )
    ).rows;
    expect(totals).toEqual([
      { status: "A", n: 1 },
      { status: "H", n: 27 },
      { status: "I", n: 1 },
      { status: "S", n: 1 },
    ]);
    await page.getByRole("button", { name: "Koreksi catatan", exact: true }).click();
    await page
      .getByLabel("Alasan koreksi atau isi ulang", { exact: true })
      .fill("Uji keyboard dan filter");
    await rows.first().focus();
    await page.keyboard.press("h");
    await expect(rows.first().getByRole("radio", { name: "H Hadir", exact: true })).toBeChecked();
    await page.keyboard.press("ArrowDown");
    await expect(rows.nth(1)).toBeFocused();
    await page.keyboard.press("s");
    await expect(rows.nth(1).getByRole("radio", { name: "S Sakit", exact: true })).toBeChecked();
    await page.keyboard.press("Control+Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Semua hadir", exact: true }).click();
    await expect(rows.locator('input[value="H"]:checked')).toHaveCount(30);
    await page.getByRole("button", { name: "Tidak hadir (0)", exact: true }).click();
    await expect(rows).toHaveCount(0);
    await page.getByRole("button", { name: "Semua (30)", exact: true }).click();
    await page.getByLabel("Cari nama siswa", { exact: true }).fill("siswa 30");
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText("Nama siswa 30");
    await page.getByRole("button", { name: "Buka kalender tanggal", exact: true }).click();
    const picker = page.getByRole("dialog", { name: "Pilih tanggal absensi", exact: true });
    await expect(picker).toBeVisible();
    await expect(picker.getByRole("button", { name: / Libur$/ }).first()).toBeVisible();
    const future = await picker
      .locator("[data-date]")
      .evaluateAll(
        (elements, max) =>
          elements
            .filter((element) => element.getAttribute("data-date")! > max)
            .map((element) => (element as HTMLButtonElement).disabled),
        today,
      );
    expect(future.every(Boolean)).toBe(true);
    await expect(
      picker.getByRole("button", { name: "Bulan berikutnya", exact: true }),
    ).toBeDisabled();
    await picker.getByRole("button", { name: "Tutup Pilih tanggal absensi", exact: true }).click();
    await expect(picker).toBeHidden();
    await page.screenshot({
      path: "test-results/attendance-redesign-390.png",
      fullPage: true,
      animations: "disabled",
    });
  } finally {
    await source.end();
  }
});
