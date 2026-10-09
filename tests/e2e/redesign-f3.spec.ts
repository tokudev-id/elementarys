import { test, expect } from "./fixtures";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { assertLocalTestDatabase } from "../../src/server/db/safety";

test("UI-F3: pagination and DataCard on remaining pages, separate form pages, audit diff sheet", async ({
  page,
}) => {
  assertLocalTestDatabase(process.env.DATABASE_URL!);
  const source = new Pool({ connectionString: process.env.DATABASE_URL });
  let currentYearId: string;
  let classId: string;
  let adminId: string;

  try {
    const yearRow = (await source.query("SELECT id FROM academic_years WHERE is_current")).rows[0];
    currentYearId = yearRow.id;
    const classRow = (
      await source.query("SELECT id FROM classes WHERE academic_year_id=$1 LIMIT 1", [currentYearId])
    ).rows[0];
    classId = classRow.id;
    const adminRow = (await source.query("SELECT id FROM \"user\" WHERE role='admin' LIMIT 1")).rows[0];
    adminId = adminRow.id;

    // Seed additional academic years so that /academic-years has > 25 items for pagination
    for (let i = 1; i <= 28; i++) {
      const y1 = 1970 + i;
      const y2 = y1 + 1;
      const label = `${y1}/${y2}`;
      const startsOn = `${y1}-07-15`;
      const endsOn = `${y2}-06-30`;
      await source.query(
        "INSERT INTO academic_years(id, label, starts_on, ends_on_exclusive, is_current, archived_at) VALUES($1, $2, $3, $4, false, now()) ON CONFLICT DO NOTHING",
        [randomUUID(), label, startsOn, endsOn],
      );
    }

    // Seed additional audit events so that /audit has > 20 items
    for (let i = 1; i <= 25; i++) {
      await source.query(
        `INSERT INTO audit_events(id, actor_id, action, entity_type, entity_id, occurred_at, request_id, reason, changes_json)
         VALUES($1, $2, 'student.update', 'student', $3, now() - interval '${i} minute', $4, $5, $6)`,
        [
          randomUUID(),
          adminId,
          randomUUID(),
          randomUUID(),
          `Alasan uji audit ${i}`,
          {
            actorName: "Admin Test",
            before: { name: `Nama Lama ${i}`, code: `OLD-${i}` },
            after: { name: `Nama Baru ${i}`, code: `NEW-${i}` },
          },
        ],
      );
    }
  } finally {
    await source.end();
  }

  // 1. Login as admin
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();

  // 2. Academic Years list (/academic-years)
  await page.goto("/academic-years");
  // Check no form exists directly on list page (finding A10 fixed)
  await expect(page.locator("form.resource-form")).toHaveCount(0);
  // Check DataCard container
  await expect(page.locator(".data-card")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Daftar tahun ajaran/ })).toBeVisible();

  // Verify pagination exists and works
  const paginationNav = page.locator(".data-pagination");
  await expect(paginationNav).toBeVisible();
  const nextBtn = page.getByRole("link", { name: /Berikutnya/ });
  if (await nextBtn.isVisible()) {
    await nextBtn.click();
    await expect(page).toHaveURL(/page=2/);
  }

  await page.screenshot({ path: "docs/redesign/after/UI-F3/tahun-ajaran-list.png" });

  // 3. New Academic Year page (/academic-years/new)
  await page.getByRole("link", { name: "Tambah tahun ajaran", exact: true }).click();
  await expect(page).toHaveURL("/academic-years/new");
  await expect(page.getByRole("heading", { name: "Tambah tahun ajaran", exact: true })).toBeVisible();

  // Form validation on empty submit
  const newYearForm = page.locator("form.redesigned-form");
  await expect(newYearForm).toBeVisible();
  expect(await newYearForm.getAttribute("novalidate")).not.toBeNull();
  await page.getByRole("button", { name: "Tambah tahun ajaran", exact: true }).click();
  await expect(page.getByLabel("Nama tahun ajaran", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator(".form-error-summary")).toBeVisible();
  await expect(page.locator(".field-error").filter({ hasText: "Gunakan format 2026/2027." })).toBeVisible();

  await page.screenshot({ path: "docs/redesign/after/UI-F3/tahun-ajaran-new.png" });

  // 4. Audit Log page (/audit)
  await page.goto("/audit");
  await expect(page.locator(".data-card")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Catatan audit/ })).toBeVisible();
  await expect(page.locator(".audit-table")).toBeVisible();

  // Click row to open diff sheet
  const firstRow = page.locator(".audit-row").first();
  await expect(firstRow).toBeVisible();
  await firstRow.click();

  // Sheet opens
  const sheetContent = page.locator(".audit-diff-sheet");
  await expect(sheetContent).toBeVisible();
  await expect(page.getByText("Perubahan data")).toBeVisible();

  // Open "Lihat data mentah"
  const rawDetails = page.locator(".audit-raw-details summary");
  await expect(rawDetails).toBeVisible();
  await rawDetails.click();
  await expect(page.locator(".audit-raw-json")).toBeVisible();

  await page.screenshot({ path: "docs/redesign/after/UI-F3/audit-list-diff.png" });

  // Close sheet by pressing Escape
  await page.keyboard.press("Escape");
  await expect(sheetContent).not.toBeVisible();

  // Verify cursor pagination: click "Halaman berikutnya"
  const nextCursorBtn = page.getByRole("link", { name: /berikutnya/i });
  await expect(nextCursorBtn).toBeVisible();
  await nextCursorBtn.click();
  await expect(page).toHaveURL(/cursor=/);

  // "Halaman sebelumnya" is now active
  const prevCursorBtn = page.getByRole("link", { name: /sebelumnya/i });
  await expect(prevCursorBtn).toBeVisible();

  // Click "Kembali ke awal"
  await page.getByRole("link", { name: /kembali ke/i }).click();
  await expect(page).not.toHaveURL(/cursor=/);
  await expect(page).not.toHaveURL(/before=/);

  // 5. Attendance History (/attendance/[classId]/history)
  await page.goto(`/attendance/${classId}/history?date=2026-10-08`);
  await expect(page.locator(".data-card")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Riwayat sesi/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Kembali ke catatan/ })).toBeVisible();

  await page.screenshot({ path: "docs/redesign/after/UI-F3/attendance-history.png" });

  // 6. Rollover page (/academic-years/rollover)
  await page.goto("/academic-years/rollover");
  await expect(page.locator("#daftar-kelas-persiapan")).toBeVisible();

  // 7. Promotion candidate selection wizard (/students/promote)
  await page.goto(`/students/promote?classId=${classId}`);
  await page.getByLabel("Tanggal mulai tahun berikutnya", { exact: true }).fill("2027-01-01");
  await page.getByLabel("Alasan batch penempatan", { exact: true }).fill("Uji coba promosi siswa");

  // Step 1: click next
  await page.getByRole("button", { name: "Lanjut: pilih siswa", exact: true }).click();

  // Step 2: candidate selection in DataCard
  await expect(page.locator("#pilih-siswa-promosi")).toBeVisible();
  const selectAllBtn = page.getByRole("button", { name: "Pilih semua di semua halaman", exact: true });
  const deselectAllBtn = page.getByRole("button", { name: "Batal pilih semua", exact: true });
  await expect(selectAllBtn).toBeVisible();
  await expect(deselectAllBtn).toBeVisible();

  await deselectAllBtn.click();
  await selectAllBtn.click();

  await page.screenshot({ path: "docs/redesign/after/UI-F3/promote-wizard.png" });

  // 8. Attendance grid (/attendance)
  await page.goto("/attendance");
  await expect(page.locator("#daftar-kelas-absensi")).toBeVisible();
});
