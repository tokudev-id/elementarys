import { test, expect } from "@playwright/test";
import { mobileViewports, expectNoPageOverflow, expectTouchTarget } from "./helpers/mobile";
test("shell identitas config, tanggal sekolah, dan navigasi sentuh/keyboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("guru@example.test");
  await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByText("Sekolah Contoh (data sintetis)", { exact: true })).toBeVisible();
  await expect(page.getByText("Zona waktu sekolah: Asia/Kuala_Lumpur")).toBeVisible();
  const expectedDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  await expect(page.locator("time")).toHaveAttribute("datetime", expectedDate);
  const nav = page.getByRole("navigation", { name: "Navigasi sekolah" });
  await expect(nav.getByRole("link")).toHaveCount(8);
  await expect(nav.getByRole("link", { name: "Hari ini" })).toHaveAttribute("aria-current", "page");
  for (const viewport of mobileViewports) {
    await page.setViewportSize(viewport);
    await expectNoPageOverflow(page);
    await expectTouchTarget(page, ".app-nav a, .app-header button");
  }
  await page.getByRole("link", { name: "Langsung ke isi halaman" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await nav.getByRole("link", { name: "Ganti password" }).focus();
  expect(
    await nav
      .getByRole("link", { name: "Ganti password" })
      .evaluate((el) => getComputedStyle(el).outlineWidth),
  ).toBe("3px");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Ganti password" })).toBeVisible();
});
