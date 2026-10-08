import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { assertLocalTestDatabase } from "../../src/server/db/safety";
import { test, expect } from "./fixtures";
import { expectNoPageOverflow } from "./helpers/mobile";

test("600 students stay paginated and filters survive navigation", async ({ page }) => {
  assertLocalTestDatabase(process.env.DATABASE_URL!);
  const source = new Pool({ connectionString: process.env.DATABASE_URL });
  const prefix = `Skala ${randomUUID().slice(0, 8)}`;
  try {
    await source.query(
      "INSERT INTO students(student_code,full_name,nis) SELECT 'P-'||nextval('student_code_seq'),$1||' '||lpad(i::text,4,'0'),$1||'-'||i FROM generate_series(1,600) i",
      [prefix],
    );
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
    await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();
    await page.goto(`/students?q=${encodeURIComponent(prefix)}`);
    await expect(page.locator(".data-table tbody tr")).toHaveCount(25);
    await expect(page.getByTestId("student-create")).toHaveCount(0);
    const firstNames = await page.locator(".data-table tbody tr td:first-child").allTextContents();
    await page.getByRole("link", { name: "Berikutnya", exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.locator(".data-table tbody tr")).toHaveCount(25);
    const secondNames = await page.locator(".data-table tbody tr td:first-child").allTextContents();
    expect(firstNames.some((name) => secondNames.includes(name))).toBe(false);
    await page.goBack();
    await expect(page.getByText("Menampilkan 1–25 dari 600", { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".master-mobile .mobile-card-list > li")).toHaveCount(25);
    await expectNoPageOverflow(page);
    await page.getByLabel("Cari nama atau kode siswa", { exact: true }).fill(`${prefix}-600`);
    await expect(page.locator(".master-mobile .mobile-card-list > li")).toHaveCount(1);
    await page.getByRole("link", { name: "Tambah siswa", exact: true }).click();
    await page.getByLabel("Nama lengkap siswa", { exact: true }).fill("Perubahan belum disimpan");
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("link", { name: "Batal", exact: true }).click();
    await expect(page.getByLabel("Nama lengkap siswa", { exact: true })).toHaveValue(
      "Perubahan belum disimpan",
    );
  } finally {
    await source.query("DELETE FROM students WHERE full_name LIKE $1", [`${prefix}%`]);
    await source.end();
  }
});
