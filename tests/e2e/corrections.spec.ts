import { logout } from "./helpers/shell";
import { test, expect, type Page } from "./fixtures";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { assertLocalTestDatabase } from "../../src/server/db/safety";
import { schoolToday } from "../../src/domain/calendar";
import { expectNoPageOverflow } from "./helpers/mobile";

let source: Pool;
test.beforeAll(() => {
  assertLocalTestDatabase(process.env.DATABASE_URL!);
  source = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
});
test.afterAll(async () => {
  await source?.end();
});

async function fixture(historical = false) {
  const tag = randomUUID().slice(0, 8);
  const timezone = (await source.query("SELECT timezone FROM school_config")).rows[0].timezone;
  const date = historical ? "2025-10-06" : schoolToday(timezone);
  const yearId = historical
    ? (
        await source.query(
          "INSERT INTO academic_years(label,starts_on,ends_on_exclusive) VALUES($1,'2025-01-01','2026-01-01') RETURNING id",
          [`Arsip ${tag}`],
        )
      ).rows[0].id
    : (await source.query("SELECT id FROM academic_years WHERE is_current")).rows[0].id;
  if (historical)
    await source.query("INSERT INTO school_weekdays SELECT $1,generate_series(1,5)", [yearId]);
  await source.query(
    "INSERT INTO school_day_overrides(academic_year_id,date,is_school_day,reason) VALUES($1,$2,true,'Uji sintetis koreksi') ON CONFLICT(academic_year_id,date) DO UPDATE SET is_school_day=true",
    [yearId, date],
  );
  const classId = (
    await source.query(
      "INSERT INTO classes(academic_year_id,grade,name) VALUES($1,1,$2) RETURNING id",
      [yearId, `Koreksi ${tag}`],
    )
  ).rows[0].id;
  for (const name of ["Siswa Awal", "Siswa Berikutnya"]) {
    const student = (
      await source.query(
        "INSERT INTO students(student_code,full_name) VALUES('S-'||nextval('student_code_seq'),$1) RETURNING id",
        [name],
      )
    ).rows[0].id;
    await source.query(
      "INSERT INTO enrollments(student_id,class_id,starts_on,ends_on_exclusive) SELECT $1,$2,starts_on,ends_on_exclusive FROM academic_years WHERE id=$3",
      [student, classId, yearId],
    );
  }
  return { classId, yearId, date, url: `/attendance/${classId}?date=${date}` };
}
async function login(page: Page, role: "admin" | "guru") {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(`${role}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hari ini", exact: true })).toBeVisible();
}
async function confirmSave(page: Page) {
  await page.getByRole("button", { name: "Simpan, siswa lainnya hadir", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Konfirmasi simpan", exact: true })
    .click();
}
async function version(classId: string) {
  return (
    await source.query("SELECT version FROM attendance_sessions WHERE class_id=$1", [classId])
  ).rows[0].version;
}

test("late arrival, no-op, conflicting correction, void and refill retain complete history on mobile", async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  const data = await fixture();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 360, height: 800 });
  await login(page, "guru");
  await page.goto(data.url);
  await page.getByRole("link", { name: "Riwayat absensi", exact: true }).click();
  await expect(page.getByText("Belum ada perubahan tercatat pada tanggal ini.")).toBeVisible();
  await page.getByRole("link", { name: "Kembali ke catatan kelas" }).click();
  const first = page.getByTestId("student-row").first();
  await first.getByRole("radio", { name: "A Alpa" }).check();
  await confirmSave(page);
  await expect(
    page.getByText("1 Hadir · 0 Sakit · 0 Izin · 1 Alpa", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Koreksi catatan", exact: true }).click();
  await first.getByRole("radio", { name: "H Hadir" }).check();
  await page.getByRole("button", { name: "Simpan, siswa lainnya hadir", exact: true }).click();
  await expect(
    page.getByText("Isi alasan koreksi atau pengisian ulang.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Alasan koreksi atau isi ulang", { exact: true })
    .fill("Siswa datang belakangan");
  await page.getByRole("button", { name: "Simpan, siswa lainnya hadir", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByLabel("Alasan koreksi atau isi ulang")).toHaveValue(
    "Siswa datang belakangan",
  );
  await page.route(
    `**/api/classes/${data.classId}/attendance/${data.date}`,
    async (route) => {
      if (route.request().method() === "PUT") await route.abort();
      else await route.continue();
    },
    { times: 1 },
  );
  await confirmSave(page);
  await expect(
    page.getByText("Belum mendapat konfirmasi penyimpanan.", { exact: false }),
  ).toBeVisible();
  await expect(first.getByRole("radio", { name: "H Hadir" })).toBeChecked();
  await expect(page.getByLabel("Alasan koreksi atau isi ulang")).toHaveValue(
    "Siswa datang belakangan",
  );
  await confirmSave(page);
  await expect(
    page.getByText("2 Hadir · 0 Sakit · 0 Izin · 0 Alpa", { exact: true }),
  ).toBeVisible();
  expect(await version(data.classId)).toBe(2);
  await page.getByRole("button", { name: "Koreksi catatan", exact: true }).click();
  await page.getByLabel("Alasan koreksi atau isi ulang").fill("Pemeriksaan tanpa perubahan");
  await confirmSave(page);
  await expect(page.getByRole("button", { name: "Koreksi catatan", exact: true })).toBeVisible();
  expect(await version(data.classId)).toBe(2);
  await page.getByRole("button", { name: "Koreksi catatan", exact: true }).click();
  await first.getByRole("radio", { name: "A Alpa" }).check();
  await page.getByLabel("Alasan koreksi atau isi ulang").fill("Pilihan usang");

  const adminContext = await browser.newContext({ viewport: { width: 360, height: 800 } });
  try {
    const admin = await adminContext.newPage();
    admin.on("pageerror", (error) => errors.push(error.message));
    await login(admin, "admin");
    await admin.goto(data.url);
    await admin.getByRole("button", { name: "Koreksi catatan", exact: true }).click();
    await admin.getByTestId("student-row").first().getByRole("radio", { name: "I Izin" }).check();
    await admin.getByLabel("Alasan koreksi atau isi ulang").fill("Koreksi operator terbaru");
    await confirmSave(admin);
    await expect(
      admin.getByText("1 Hadir · 0 Sakit · 1 Izin · 0 Alpa", { exact: true }),
    ).toBeVisible();
    await confirmSave(page);
    await expect(
      page.getByText("Catatan terbaru sudah dimuat. Periksa status dan nama pencatat."),
    ).toBeVisible();
    await expect(first.getByText("Izin", { exact: true })).toBeVisible();
    expect(await version(data.classId)).toBe(3);
    await page.getByRole("button", { name: "Muat data terbaru", exact: true }).click();
    await expect(page.getByLabel("Alasan koreksi atau isi ulang")).toHaveCount(0);
    const denied = await page.request.post(
      `/api/classes/${data.classId}/attendance/${data.date}/void`,
      {
        headers: { origin: process.env.BETTER_AUTH_URL! },
        data: { expectedVersion: 3, reason: "Guru tidak boleh void" },
      },
    );
    expect(denied.status()).toBe(403);
    await admin.getByLabel("Alasan pembatalan", { exact: true }).fill("Periksa ulang kelas");
    await admin.getByRole("button", { name: "Batalkan sesi", exact: true }).click();
    await admin.keyboard.press("Escape");
    await expect(admin.getByLabel("Alasan pembatalan")).toHaveValue("Periksa ulang kelas");
    await admin.getByRole("button", { name: "Batalkan sesi", exact: true }).click();
    await admin
      .getByRole("dialog")
      .getByRole("button", { name: "Konfirmasi pembatalan", exact: true })
      .click();
    await expect(
      admin.getByRole("button", { name: "Isi ulang catatan", exact: true }),
    ).toBeVisible();
    expect(await version(data.classId)).toBe(4);
    await expect(
      admin.getByText(
        "Catatan pada tanggal ini dibatalkan. Riwayat dan alasan pembatalan tetap tersedia.",
      ),
    ).toBeInViewport();
    await page.reload();
    await page.getByRole("button", { name: "Isi ulang catatan", exact: true }).click();
    await first.getByRole("radio", { name: "S Sakit" }).check();
    await page.getByLabel("Alasan koreksi atau isi ulang").fill("Isi ulang sesudah verifikasi");
    await confirmSave(page);
    await expect(
      page.getByText("1 Hadir · 1 Sakit · 0 Izin · 0 Alpa", { exact: true }),
    ).toBeVisible();
    expect(await version(data.classId)).toBe(5);
    const report = await (
      await page.request.get(
        `/api/reports/attendance?yearId=${data.yearId}&classId=${data.classId}&month=${data.date.slice(0, 7)}`,
      )
    ).json();
    expect(report.classes[0].totals).toEqual({ H: 1, S: 1, I: 0, A: 0 });
    await page.getByRole("link", { name: "Riwayat absensi", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Riwayat absensi", exact: true })).toBeVisible();
    await expect(page.locator(".history-list > li")).toHaveCount(5);
    await expect(page.getByText("Alasan: Siswa datang belakangan", { exact: true })).toBeVisible();
    await expect(page.getByText("Alasan: Periksa ulang kelas", { exact: true })).toBeVisible();
    await expect(page.getByText("Alpa → Hadir", { exact: true })).toBeVisible();
    for (const width of [360, 768, 1024]) {
      await page.setViewportSize({ width, height: 800 });
      await expectNoPageOverflow(page);
    }
    await page.setViewportSize({ width: 360, height: 800 });
    await page.screenshot({ path: "test-results/attendance-history-360.png", fullPage: true });
    expect(errors).toEqual([]);
  } finally {
    await adminContext.close();
  }
});

test("admin records and corrects a historical year while teacher can only read its history", async ({
  page,
}) => {
  const data = await fixture(true);
  await page.setViewportSize({ width: 360, height: 800 });
  await login(page, "admin");
  await page.goto(data.url);
  await page.getByTestId("student-row").first().getByRole("radio", { name: "A Alpa" }).check();
  await page.getByLabel("Alasan koreksi atau isi ulang").fill("Melengkapi tahun lama");
  await confirmSave(page);
  await expect(page.getByRole("button", { name: "Koreksi catatan", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Koreksi catatan", exact: true }).click();
  await page.getByTestId("student-row").first().getByRole("radio", { name: "H Hadir" }).check();
  await page.getByLabel("Alasan koreksi atau isi ulang").fill("Verifikasi arsip");
  await confirmSave(page);
  await expect(
    page.getByText("2 Hadir · 0 Sakit · 0 Izin · 0 Alpa", { exact: true }),
  ).toBeVisible();
  await expectNoPageOverflow(page);
  await logout(page);
  await expect(
    page.getByRole("heading", { name: "Masuk ke Absensi Sekolah", exact: true }),
  ).toBeVisible();
  await login(page, "guru");
  await page.goto(data.url);
  await expect(page.getByRole("button", { name: "Koreksi catatan", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Batalkan sesi", exact: true })).toHaveCount(0);
  const roster = await (
    await page.request.get(`/api/classes/${data.classId}/attendance?date=${data.date}`)
  ).json();
  const denied = await page.request.put(`/api/classes/${data.classId}/attendance/${data.date}`, {
    headers: { origin: process.env.BETTER_AUTH_URL! },
    data: {
      expectedVersion: 2,
      reason: "Guru tahun lama",
      entries: roster.students.map((student: { enrollmentId: string }) => ({
        enrollmentId: student.enrollmentId,
        status: "A",
      })),
    },
  });
  expect(denied.status()).toBe(403);
  await page.getByRole("link", { name: "Riwayat absensi", exact: true }).click();
  await expect(page.locator(".history-list > li")).toHaveCount(2);
  await expectNoPageOverflow(page);
});
