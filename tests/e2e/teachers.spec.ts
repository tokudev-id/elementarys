import { logout } from "./helpers/shell";
import { test, expect, type Page } from "./fixtures";
import { randomUUID } from "node:crypto";
import { expectNoPageOverflow } from "./helpers/mobile";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
}
test("profile account classes reset and temporary-password journey work on mobile", async ({
  page,
  browser,
}) => {
  const tag = randomUUID().slice(0, 8);
  const name = `Guru Baru ${tag}`;
  const email = `guru-new-${tag}@example.test`;
  const resetPassword = "ResetSynthetic123!";
  await page.setViewportSize({ width: 360, height: 800 });
  await login(page, "admin@example.test", "SyntheticTest123!");
  await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();
  await page.goto("/teachers");
  await expect(page.getByTestId("teacher-create")).toHaveCount(0);
  await page.getByRole("link", { name: "Tambah guru", exact: true }).click();
  await page.getByLabel("Nama lengkap guru", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Tambah profil guru", exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  const detailUrl = page.url();
  await page.getByRole("tab", { name: "Kelas utama", exact: true }).click();
  await page.getByLabel("Kelas 1 Contoh", { exact: true }).check();
  await page.getByRole("button", { name: "Simpan kelas utama", exact: true }).click();
  await expect(page.getByText("Tersimpan", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Akun & akses", exact: true }).click();
  await page.getByLabel("Email akun guru", { exact: true }).fill(email);
  await page.getByLabel("Password sementara", { exact: true }).fill("TemporarySynthetic123!");
  await page.getByRole("button", { name: "Hubungkan akun guru", exact: true }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset password akun", exact: true }).click();
  const reset = page.getByRole("dialog", { name: "Reset password akun?", exact: true });
  await reset.getByLabel("Password sementara baru", { exact: true }).fill(resetPassword);
  const receipt = page.waitForResponse(
    (response) =>
      response.url().includes("/reset-password") && response.request().method() === "POST",
  );
  await reset.getByRole("button", { name: "Reset password akun", exact: true }).click();
  expect((await receipt).status()).toBe(200);
  await expect(reset).toBeHidden();
  await page.getByRole("button", { name: "Nonaktifkan akses", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Nonaktifkan akses", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Aktifkan akses", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Aktifkan akses", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Aktifkan akses", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Nonaktifkan akses", exact: true })).toBeVisible();
  for (const width of [360, 768, 1024]) {
    await page.setViewportSize({ width, height: 800 });
    await expectNoPageOverflow(page);
  }
  await logout(page);
  await expect(
    page.getByRole("heading", { name: "Masuk ke Absensi Sekolah", exact: true }),
  ).toBeVisible();
  await login(page, email, resetPassword);
  await expect(page.getByRole("heading", { name: "Ganti password", exact: true })).toBeVisible();
  await page.getByLabel("Password saat ini", { exact: true }).fill(resetPassword);
  await page.getByLabel("Password baru", { exact: true }).fill("ChangedSynthetic123!");
  await page.getByRole("button", { name: "Simpan password baru", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();
  await page.goto(detailUrl);
  await expect(page.getByRole("tab", { name: "Akun & akses", exact: true })).toHaveCount(0);
  const context = await browser.newContext();
  const admin = await context.newPage();
  await login(admin, "admin@example.test", "SyntheticTest123!");
  await expect(admin.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();
  await admin.goto(detailUrl);
  await admin.getByRole("link", { name: "Ubah", exact: true }).click();
  await admin.getByRole("switch", { name: "Profil aktif", exact: true }).click();
  await admin.getByRole("button", { name: "Simpan profil guru", exact: true }).click();
  await admin
    .getByRole("dialog")
    .getByRole("button", { name: "Nonaktifkan profil", exact: true })
    .click();
  await expect(admin.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(
    admin
      .getByRole("tabpanel", { name: "Profil", exact: true })
      .getByText("Nonaktif", { exact: true }),
  ).toBeVisible();
  expect((await page.request.get("/api/me")).status()).toBe(401);
  await context.close();
});
