import { test, expect } from "./fixtures";
import { Pool } from "pg";
import { assertLocalTestDatabase } from "../../src/server/db/safety";

test("UI-F2: inline validation, noValidate, first error focus, error summary, and dialog stays open on error", async ({
  page,
}) => {
  assertLocalTestDatabase(process.env.DATABASE_URL!);
  const source = new Pool({ connectionString: process.env.DATABASE_URL });
  let studentId: string;
  try {
    const studentRow = (
      await source.query("SELECT id FROM students WHERE archived_at IS NULL LIMIT 1")
    ).rows[0];
    studentId = studentRow.id;
  } finally {
    await source.end();
  }

  // 1. Login form validation: empty submit, noValidate, focus first error, inline messages
  await page.goto("/login");
  const loginForm = page.locator("form");
  await expect(loginForm).toBeVisible();
  const hasNoValidate = await loginForm.getAttribute("novalidate");
  expect(hasNoValidate).not.toBeNull();

  // Submit empty
  await page.getByRole("button", { name: "Masuk", exact: true }).click();

  // Check first error is focused (Email input)
  await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Isi email.")).toBeVisible();
  await expect(page.getByText("Isi password.")).toBeVisible();

  // Fill invalid email format
  await page.getByLabel("Email", { exact: true }).fill("bukan-email");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByText("Format email belum benar.")).toBeVisible();

  await page.screenshot({ path: "docs/redesign/after/UI-F2/login-error.png" });

  // Now login properly
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();

  // 2. Student Create Form: validation rules
  await page.goto("/students/new");
  const studentForm = page.locator("form");
  await expect(studentForm).toBeVisible();
  expect(await studentForm.getAttribute("novalidate")).not.toBeNull();

  // Submit empty
  await page.getByRole("button", { name: "Tambah siswa", exact: true }).click();

  // First error focused: Nama lengkap
  await expect(page.getByLabel("Nama lengkap siswa", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Nama lengkap siswa", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByText("Isi nama siswa.")).toBeVisible();

  // Test invalid name (only 1 char)
  await page.getByLabel("Nama lengkap siswa", { exact: true }).fill("A");
  await page.getByRole("button", { name: "Tambah siswa", exact: true }).click();
  await expect(page.getByText("Nama minimal 2 huruf.")).toBeVisible();

  // Test invalid NIS
  await page.getByLabel("NIS", { exact: true }).fill("NIS 123 !");
  await page.getByRole("button", { name: "Tambah siswa", exact: true }).click();
  await expect(
    page.getByText("NIS hanya boleh angka, titik, garis miring, atau strip."),
  ).toBeVisible();

  // Test invalid NISN (not 10 digits)
  await page.getByLabel("NISN", { exact: true }).fill("12345");
  await page.getByLabel("NISN", { exact: true }).press("Enter");
  await expect(page.locator(".field-error").getByText("NISN harus 10 digit angka.")).toBeVisible();

  // Error summary should be visible when >= 3 errors
  await expect(page.locator(".form-error-summary")).toBeVisible();
  await expect(
    page.locator(".form-error-summary").getByText("NISN harus 10 digit angka."),
  ).toBeVisible();

  await page.screenshot({ path: "docs/redesign/after/UI-F2/siswa-form-error.png" });

  // 3. Class Create Form: validation
  await page.goto("/classes/new");
  const classForm = page.locator("form");
  await expect(classForm).toBeVisible();
  expect(await classForm.getAttribute("novalidate")).not.toBeNull();

  await page.getByRole("button", { name: "Tambah kelas", exact: true }).click();
  await expect(page.getByLabel("Nama kelas", { exact: true })).toBeFocused();
  await expect(page.getByText("Isi nama kelas.")).toBeVisible();

  await page.screenshot({ path: "docs/redesign/after/UI-F2/kelas-form-error.png" });

  // 4. Lifecycle Dialog validation (Dialog stays open on invalid submit)
  await page.goto(`/students/${studentId}`);
  // Open end enrollment or placement dialog
  const endEnrollBtn = page.getByRole("button", { name: "Tutup penempatan", exact: false }).first();
  if (await endEnrollBtn.isVisible()) {
    await endEnrollBtn.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Submit empty reason
    await dialog.getByRole("button", { name: "Tutup penempatan", exact: true }).click();

    // Dialog must stay open
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Isi alasan siswa keluar.")).toBeVisible();

    await page.screenshot({ path: "docs/redesign/after/UI-F2/dialog-error.png" });
  }
});
