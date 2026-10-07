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
  const temporary = "TemporarySynthetic123!";
  const resetPassword = "ResetSynthetic123!";
  await page.setViewportSize({ width: 360, height: 800 });
  await login(page, "admin@example.test", "SyntheticTest123!");
  await expect(page.getByRole("heading", { name: "Hari ini", exact: true })).toBeVisible();
  await page.goto("/teachers");
  const create = page.getByTestId("teacher-create");
  await create.getByLabel("Nama lengkap guru", { exact: true }).fill(name);
  await create.getByRole("button", { name: "Tambah profil guru", exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  const card = page
    .locator('[data-testid^="teacher-"]')
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await card.getByLabel("Kelas 1 Contoh", { exact: true }).check();
  await card.getByRole("button", { name: "Simpan kelas utama", exact: true }).click();
  await expect(card.getByText("Kelas utama: Kelas 1 Contoh", { exact: true })).toBeVisible();
  await card.getByLabel("Email akun guru", { exact: true }).fill(email);
  await card.getByLabel("Password sementara", { exact: true }).fill(temporary);
  await card.getByRole("button", { name: "Hubungkan akun guru", exact: true }).click();
  await expect(card.locator("p").filter({ hasText: `Akun ${email}` })).toBeVisible();
  await card.getByLabel("Password sementara baru", { exact: true }).fill(resetPassword);
  const receipt = page.waitForResponse(
    (response) =>
      response.url().includes("/reset-password") && response.request().method() === "POST",
  );
  await card.getByRole("button", { name: "Reset password akun", exact: true }).click();
  expect((await receipt).status()).toBe(200);
  await expect(
    card
      .getByRole("form", { name: `Reset password ${email}`, exact: true })
      .getByText("Tersimpan", { exact: true }),
  ).toBeVisible();
  await expect(card.getByRole("button", { name: "Simpan akses akun", exact: true })).toBeEnabled();
  await card.getByLabel("Nonaktifkan akses akun", { exact: true }).check();
  await card.getByRole("button", { name: "Simpan akses akun", exact: true }).click();
  await expect(card.locator("p").filter({ hasText: `Akun ${email}` })).toContainText(
    "Akses nonaktif",
  );
  await card.getByLabel("Nonaktifkan akses akun", { exact: true }).uncheck();
  await card.getByRole("button", { name: "Simpan akses akun", exact: true }).click();
  await expect(card.locator("p").filter({ hasText: `Akun ${email}` })).toContainText("Akses aktif");
  for (const width of [360, 768, 1024]) {
    await page.setViewportSize({ width, height: 800 });
    await expectNoPageOverflow(page);
  }
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Masuk ke Absensi Sekolah", exact: true }),
  ).toBeVisible();
  await login(page, email, resetPassword);
  await expect(page.getByRole("heading", { name: "Ganti password", exact: true })).toBeVisible();
  await page.getByLabel("Password saat ini", { exact: true }).fill(resetPassword);
  await page.getByLabel("Password baru", { exact: true }).fill("ChangedSynthetic123!");
  await page.getByRole("button", { name: "Simpan password baru", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hari ini", exact: true })).toBeVisible();
  await page.goto("/teachers");
  await expect(page.getByRole("button", { name: "Reset password akun", exact: true })).toHaveCount(
    0,
  );
  const context = await browser.newContext();
  const admin = await context.newPage();
  await login(admin, "admin@example.test", "SyntheticTest123!");
  await expect(admin.getByRole("heading", { name: "Hari ini", exact: true })).toBeVisible();
  await admin.goto("/teachers");
  const adminCard = admin
    .locator('[data-testid^="teacher-"]')
    .filter({ has: admin.getByRole("heading", { name, exact: true }) });
  await adminCard.getByLabel("Profil aktif", { exact: true }).uncheck();
  await adminCard.getByRole("button", { name: "Simpan profil guru", exact: true }).click();
  await expect(
    adminCard.getByText("Profil nonaktif · Akun tertaut", { exact: true }),
  ).toBeVisible();
  expect((await page.request.get("/api/me")).status()).toBe(401);
  await context.close();
});
