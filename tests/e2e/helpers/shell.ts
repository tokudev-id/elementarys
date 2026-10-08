import { expect, type Page } from "../fixtures";

export async function openAccount(page: Page) {
  const menu = page.locator('[role="menu"][data-state="open"]');
  if (!(await menu.isVisible()))
    await page.getByRole("button", { name: "Menu pengguna", exact: true }).click();
  await expect(menu).toBeVisible();
}
export async function logout(page: Page) {
  await openAccount(page);
  await page.getByRole("menuitem", { name: "Keluar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Masuk ke Absensi Sekolah", exact: true }),
  ).toBeVisible();
}
export async function openPassword(page: Page) {
  await openAccount(page);
  await page.getByRole("menuitem", { name: "Ganti password", exact: true }).click();
}
export async function navigate(page: Page, name: string) {
  const link = page.getByRole("link", { name, exact: true });
  if (!(await link.isVisible()))
    await page.getByRole("button", { name: "Lainnya", exact: true }).click();
  await link.click();
}
