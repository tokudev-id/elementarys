import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { schoolToday } from "../../src/domain/calendar";
import { assertLocalTestDatabase } from "../../src/server/db/safety";
import { test, expect, type Page } from "./fixtures";
import { expectNoPageOverflow } from "./helpers/mobile";

async function prepareClass() {
  assertLocalTestDatabase(process.env.DATABASE_URL!);
  const source = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const date = schoolToday(
      (await source.query("SELECT timezone FROM school_config")).rows[0].timezone,
    );
    const yearId = (await source.query("SELECT id FROM academic_years WHERE is_current")).rows[0]
      .id;
    await source.query(
      "INSERT INTO school_day_overrides(academic_year_id,date,is_school_day,reason) VALUES($1,$2,true,'Verifikasi panduan sintetis') ON CONFLICT(academic_year_id,date) DO UPDATE SET is_school_day=true",
      [yearId, date],
    );
    const className = `Panduan ${randomUUID().slice(0, 8)}`;
    const classId = (
      await source.query(
        "INSERT INTO classes(academic_year_id,grade,name) VALUES($1,1,$2) RETURNING id",
        [yearId, className],
      )
    ).rows[0].id;
    for (const name of ["Siswa Panduan Awal", "Siswa Panduan Berikutnya"]) {
      const studentId = (
        await source.query(
          "INSERT INTO students(student_code,full_name) VALUES('S-'||nextval('student_code_seq'),$1) RETURNING id",
          [name],
        )
      ).rows[0].id;
      await source.query(
        "INSERT INTO enrollments(student_id,class_id,starts_on,ends_on_exclusive) SELECT $1,$2,starts_on,ends_on_exclusive FROM academic_years WHERE id=$3",
        [studentId, classId, yearId],
      );
    }
    return { classId, className, yearId, date };
  } finally {
    await source.end();
  }
}

async function confirmSave(page: Page) {
  await page.getByRole("button", { name: "Simpan absensi", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("dialog", { name: /^Simpan absensi/ })).toBeHidden();
}

test("teacher follows guide from daily attendance through correction and monthly exports", async ({
  page,
}) => {
  test.setTimeout(60000);
  const data = await prepareClass();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("guru@example.test");
  await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();
  await page
    .getByTestId("class-row")
    .filter({ has: page.locator(`a[href*="${data.classId}"]`) })
    .getByRole("link", { name: "Catat absensi", exact: true })
    .click();
  const first = page.getByTestId("student-row").first();
  await first.getByRole("radio", { name: "A Alpa", exact: true }).check();
  await confirmSave(page);
  await expect(
    page.getByText("1 Hadir · 0 Sakit · 0 Izin · 1 Alpa", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Koreksi catatan", exact: true }).click();
  await first.getByRole("radio", { name: "H Hadir", exact: true }).check();
  const reason = "Siswa datang setelah pencatatan pagi";
  await page.getByLabel("Alasan koreksi atau isi ulang", { exact: true }).fill(reason);
  await confirmSave(page);
  await expect(
    page.getByText("2 Hadir · 0 Sakit · 0 Izin · 0 Alpa", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Riwayat absensi", exact: true }).click();
  await expect(page.getByText(`Alasan: ${reason}`, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Kembali ke catatan kelas", exact: true }).click();
  await page.getByRole("link", { name: "Rekap", exact: true }).click();
  await page.getByLabel("Tahun ajaran", { exact: true }).selectOption(data.yearId);
  await page.getByLabel("Bulan", { exact: true }).fill(data.date.slice(0, 7));
  await page.getByLabel("Kelas", { exact: true }).selectOption(data.classId);
  await page.getByRole("button", { name: "Tampilkan rekap", exact: true }).click();
  await expect(page.locator(".report-totals-list li")).toHaveCount(2);
  await expectNoPageOverflow(page);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Unduh Excel", exact: true }).click();
  expect((await download).suggestedFilename()).toBe(`rekap-${data.date.slice(0, 7)}.xlsx`);
  await page.getByRole("link", { name: "Buka halaman cetak", exact: true }).click();
  await expect(page.locator(".print-class")).toHaveCount(1);
  await expect(page.locator(".print-class")).toContainText(data.className);
  await page.evaluate(() => {
    window.print = () => {
      document.documentElement.dataset.printRequested = "true";
    };
  });
  await page.getByRole("button", { name: "Cetak", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-print-requested", "true");
  await expectNoPageOverflow(page);
  expect(errors).toEqual([]);
});
