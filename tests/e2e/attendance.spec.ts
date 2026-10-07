import { test, expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { createAuth } from "../../src/server/auth/factory";
import { createManagedAccount } from "../../src/server/auth/accounts";
import { assertLocalTestDatabase } from "../../src/server/db/safety";
import { schoolToday } from "../../src/domain/calendar";
import { expectNoPageOverflow } from "./helpers/mobile";

let source: Pool;
const workingDate = schoolToday("Asia/Kuala_Lumpur");
test.beforeAll(() => {
  assertLocalTestDatabase(process.env.DATABASE_URL!);
  source = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
});
test.afterAll(async () => {
  await source?.end();
});
async function fixture() {
  const tag = randomUUID().slice(0, 8);
  const email = `guru-${tag}@example.test`;
  const name = `Guru Uji ${tag}`;
  const auth = createAuth(source, process.env.BETTER_AUTH_SECRET!, process.env.BETTER_AUTH_URL!);
  const account = await createManagedAccount(auth, {
    email,
    name,
    password: "SyntheticTest123!",
    role: "teacher",
    mustChangePassword: false,
  });
  const teacher = (
    await source.query("INSERT INTO teachers(user_id,full_name) VALUES($1,$2) RETURNING id", [
      account.user.id,
      name,
    ])
  ).rows[0].id;
  const year = (await source.query("SELECT id FROM academic_years WHERE is_current")).rows[0].id;
  await source.query(
    "INSERT INTO school_day_overrides(academic_year_id,date,is_school_day,reason) VALUES($1,$2,true,'Hari uji sintetis') ON CONFLICT(academic_year_id,date) DO UPDATE SET is_school_day=true",
    [year, workingDate],
  );
  const classId = (
    await source.query(
      "INSERT INTO classes(academic_year_id,grade,name) VALUES($1,1,$2) RETURNING id",
      [year, `Kelas Uji ${tag}`],
    )
  ).rows[0].id;
  await source.query("INSERT INTO teacher_classes VALUES($1,$2)", [teacher, classId]);
  for (let i = 1; i <= 10; i++) {
    const student = (
      await source.query(
        "INSERT INTO students(student_code,full_name) VALUES('S-'||nextval('student_code_seq'),$1) RETURNING id",
        [`Siswa Uji ${i}`],
      )
    ).rows[0].id;
    await source.query(
      "INSERT INTO enrollments(student_id,class_id,starts_on,ends_on_exclusive) VALUES($1,$2,'2026-01-01','2027-01-01')",
      [student, classId],
    );
  }
  return { classId, email, name, userId: account.user.id };
}
async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hari ini", exact: true })).toBeVisible();
}
const url = (classId: string) => `/attendance/${classId}?date=${workingDate}`;
const saveButton = (page: Page) =>
  page.getByRole("button", { name: "Simpan, siswa lainnya hadir", exact: true });
async function choose(page: Page) {
  const rows = page.getByTestId("student-row");
  await expect(rows).toHaveCount(10);
  await rows.nth(0).getByRole("radio", { name: "S Sakit" }).check();
  await rows.nth(1).getByRole("radio", { name: "I Izin" }).check();
}
async function counts(classId: string) {
  return (
    await source.query(
      "SELECT count(*)::int n FROM attendance_records r JOIN attendance_sessions s ON s.id=r.session_id WHERE s.class_id=$1",
      [classId],
    )
  ).rows[0].n;
}

for (const width of [360, 768, 1024]) {
  test(`simpan satu Sakit satu Izin dan dashboard ${width}px`, async ({ page }) => {
    const data = await fixture();
    await page.setViewportSize({ width, height: 800 });
    await login(page, data.email);
    await page.goto(url(data.classId));
    await expect(page.getByText("Belum dicatat", { exact: true })).toHaveCount(10);
    const start = Date.now();
    await choose(page);
    await expectNoPageOverflow(page);
    await saveButton(page).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("8 Hadir", { exact: true })).toBeVisible();
    await expect(dialog.getByText("1 Sakit", { exact: true })).toBeVisible();
    await expect(dialog.getByText("1 Izin", { exact: true })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `test-results/attendance-confirm-${width}.png` });
    await dialog.getByRole("button", { name: "Konfirmasi simpan", exact: true }).click();
    await expect(page.getByText("Tersimpan", { exact: true })).toBeInViewport();
    await expect(
      page.getByText("8 Hadir · 1 Sakit · 1 Izin · 0 Alpa", { exact: true }),
    ).toBeVisible();
    expect(await counts(data.classId)).toBe(10);
    console.log(`UI automation ${width}px: ${Date.now() - start}ms; bukan waktu guru nyata`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `test-results/attendance-saved-${width}.png`, fullPage: true });
    await page.getByRole("link", { name: "Kembali ke hari ini", exact: true }).click();
    const visibleRow = page
      .getByTestId("class-row")
      .filter({ has: page.locator(`a[href*="${data.classId}"]`) });
    await expect(visibleRow.getByText("Sudah dicatat", { exact: true })).toBeVisible();
    await expect(
      visibleRow.getByText("8 Hadir · 1 Sakit · 1 Izin · 0 Alpa", { exact: true }),
    ).toBeVisible();
  });
}
test("buka tanpa simpan dan batal konfirmasi tidak menulis", async ({ page }) => {
  const data = await fixture();
  await login(page, data.email);
  await page.goto(url(data.classId));
  await choose(page);
  await saveButton(page).click();
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  expect(await counts(data.classId)).toBe(0);
  await page.goto("/attendance");
  expect(await counts(data.classId)).toBe(0);
});
test("jaringan gagal dan rotasi mempertahankan pilihan, retry menyimpan", async ({ page }) => {
  const data = await fixture();
  await login(page, data.email);
  await page.goto(url(data.classId));
  await choose(page);
  await page.setViewportSize({ width: 800, height: 360 });
  await expect(
    page.getByTestId("student-row").nth(0).getByRole("radio", { name: "S Sakit" }),
  ).toBeChecked();
  await expectNoPageOverflow(page);
  await page.route(`**/api/classes/${data.classId}/attendance/${workingDate}`, (route) =>
    route.abort("failed"),
  );
  await saveButton(page).click();
  await page.getByRole("button", { name: "Konfirmasi simpan", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Belum mendapat konfirmasi" }),
  ).toBeVisible();
  await expect(
    page.getByTestId("student-row").nth(1).getByRole("radio", { name: "I Izin" }),
  ).toBeChecked();
  expect(await counts(data.classId)).toBe(0);
  await page.unroute(`**/api/classes/${data.classId}/attendance/${workingDate}`);
  await saveButton(page).click();
  await page.getByRole("button", { name: "Konfirmasi simpan", exact: true }).click();
  await expect(page.getByText("Tersimpan", { exact: true })).toBeVisible();
});
test("konflik dua akun memuat status dan pencatat terbaru", async ({ page, browser }) => {
  const data = await fixture();
  const other = await fixture();
  await login(page, data.email);
  await page.goto(url(data.classId));
  await choose(page);
  const context = await browser.newContext();
  const second = await context.newPage();
  await login(second, other.email);
  await second.goto(url(data.classId));
  await saveButton(second).click();
  await second.getByRole("button", { name: "Konfirmasi simpan", exact: true }).click();
  await expect(second.getByText("Tersimpan", { exact: true })).toBeVisible();
  await saveButton(page).click();
  await page.getByRole("button", { name: "Konfirmasi simpan", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Catatan terbaru sudah dimuat" }),
  ).toBeVisible();
  await expect(
    page.getByText("10 Hadir · 0 Sakit · 0 Izin · 0 Alpa", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(`Dicatat oleh ${other.name}`, { exact: false })).toBeVisible();
  expect(await counts(data.classId)).toBe(10);
  await context.close();
});
test("respons hilang setelah commit dapat dicoba ulang tanpa duplikasi", async ({ page }) => {
  const data = await fixture();
  await login(page, data.email);
  await page.goto(url(data.classId));
  await choose(page);
  await page.route(`**/api/classes/${data.classId}/attendance/${workingDate}`, async (route) => {
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    await route.abort("failed");
  });
  await saveButton(page).click();
  await page.getByRole("button", { name: "Konfirmasi simpan", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Belum mendapat konfirmasi" }),
  ).toBeVisible();
  expect(await counts(data.classId)).toBe(10);
  await page.unroute(`**/api/classes/${data.classId}/attendance/${workingDate}`);
  await saveButton(page).click();
  await page.getByRole("button", { name: "Konfirmasi simpan", exact: true }).click();
  await expect(page.getByText("Tersimpan", { exact: true })).toBeVisible();
  const session = (
    await source.query("SELECT id,version FROM attendance_sessions WHERE class_id=$1", [
      data.classId,
    ])
  ).rows[0];
  expect(session.version).toBe(1);
  expect(
    (
      await source.query("SELECT count(*)::int n FROM audit_events WHERE entity_id=$1", [
        session.id,
      ])
    ).rows[0].n,
  ).toBe(1);
});
test("sesi habis mempertahankan pilihan dan tidak mengklaim tersimpan", async ({ page }) => {
  const data = await fixture();
  await login(page, data.email);
  await page.goto(url(data.classId));
  await choose(page);
  await source.query('DELETE FROM "session" WHERE user_id=$1', [data.userId]);
  await saveButton(page).click();
  await page.getByRole("button", { name: "Konfirmasi simpan", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Sesi telah habis" })).toBeVisible();
  await expect(
    page.getByTestId("student-row").nth(0).getByRole("radio", { name: "S Sakit" }),
  ).toBeChecked();
  await expect(page.getByText("Tersimpan", { exact: true })).toHaveCount(0);
  expect(await counts(data.classId)).toBe(0);
});

test("konflik roster dengan reload gagal mengunci simpan sampai data terbaru dimuat", async ({
  page,
}) => {
  const data = await fixture();
  await login(page, data.email);
  await page.goto(url(data.classId));
  await choose(page);
  const student = (
    await source.query(
      "INSERT INTO students(student_code,full_name) VALUES('S-'||nextval('student_code_seq'),'Siswa Uji Tambahan') RETURNING id",
    )
  ).rows[0].id;
  await source.query(
    "INSERT INTO enrollments(student_id,class_id,starts_on,ends_on_exclusive) VALUES($1,$2,'2026-01-01','2027-01-01')",
    [student, data.classId],
  );
  await page.route(`**/api/classes/${data.classId}/attendance?*`, (route) => route.abort("failed"));
  await saveButton(page).click();
  await page.getByRole("button", { name: "Konfirmasi simpan", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "data terbaru belum dapat dimuat" }),
  ).toBeVisible();
  await expect(saveButton(page)).toBeDisabled();
  await expect(
    page.getByTestId("student-row").nth(0).getByRole("radio", { name: "S Sakit" }),
  ).toBeChecked();
  expect(await counts(data.classId)).toBe(0);
  await page.unroute(`**/api/classes/${data.classId}/attendance?*`);
  await page.getByRole("button", { name: "Muat data terbaru", exact: true }).click();
  await expect(page.getByTestId("student-row")).toHaveCount(11);
  await expect(saveButton(page)).toBeEnabled();
  await saveButton(page).click();
  await page.getByRole("button", { name: "Konfirmasi simpan", exact: true }).click();
  await expect(page.getByText("Tersimpan", { exact: true })).toBeVisible();
  expect(await counts(data.classId)).toBe(11);
});

test("respons simpan tidak valid tidak mengklaim berhasil dan tetap dapat dicoba ulang", async ({
  page,
}) => {
  const data = await fixture();
  await login(page, data.email);
  await page.goto(url(data.classId));
  await choose(page);
  await page.route(`**/api/classes/${data.classId}/attendance/${workingDate}`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
  await saveButton(page).click();
  await page.getByRole("button", { name: "Konfirmasi simpan", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Belum mendapat konfirmasi" }),
  ).toBeVisible();
  await expect(page.getByText("Tersimpan", { exact: true })).toHaveCount(0);
  await expect(
    page.getByTestId("student-row").nth(0).getByRole("radio", { name: "S Sakit" }),
  ).toBeChecked();
  expect(await counts(data.classId)).toBe(0);
  await page.unroute(`**/api/classes/${data.classId}/attendance/${workingDate}`);
  await saveButton(page).click();
  await page.getByRole("button", { name: "Konfirmasi simpan", exact: true }).click();
  await expect(page.getByText("Tersimpan", { exact: true })).toBeVisible();
});

test("ganti tanggal menghormati batal, memuat hari terlewat, dan keyboard membatalkan konfirmasi", async ({
  page,
}) => {
  const data = await fixture();
  await login(page, data.email);
  await page.goto(url(data.classId));
  await choose(page);
  const previous = new Date(`${workingDate}T12:00:00Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  const previousDate = previous.toISOString().slice(0, 10);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByLabel("Tanggal absensi", { exact: true }).fill(previousDate);
  await expect(page.getByLabel("Tanggal absensi", { exact: true })).toHaveValue(workingDate);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Tanggal absensi", { exact: true }).fill(previousDate);
  await expect(page).toHaveURL(new RegExp(`date=${previousDate}`));
  await expect(page.getByText("Belum dicatat", { exact: true })).toHaveCount(10);
  const trigger = saveButton(page);
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  expect(await counts(data.classId)).toBe(0);
  expect(await page.locator(".attendance-form [style], .ui-dialog[style]").count()).toBe(0);
});
