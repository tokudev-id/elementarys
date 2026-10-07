import { test, expect } from "./fixtures";

for (const width of [360, 768, 1024]) {
  test(`login dan logout ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill("guru@example.test");
    await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(page.getByText("Guru Contoh · Guru", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole("button", { name: "Keluar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Masuk ke Absensi Sekolah" })).toBeVisible();
  });
}
test("ganti password mempertahankan sesi baru lalu logout", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.getByRole("link", { name: "Ganti password" }).click();
  await page.getByLabel("Password saat ini", { exact: true }).fill("SyntheticTest123!");
  await page.getByLabel("Password baru", { exact: true }).fill("FreshSynthetic123!");
  await page.getByRole("button", { name: "Simpan password baru" }).click();
  await expect(page.getByText("Guru Admin Contoh · Admin", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Ganti password" }).click();
  await page.getByLabel("Password saat ini", { exact: true }).fill("FreshSynthetic123!");
  await page.getByLabel("Password baru", { exact: true }).fill("SyntheticTest123!");
  await page.getByRole("button", { name: "Simpan password baru" }).click();
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Masuk ke Absensi Sekolah" })).toBeVisible();
});
