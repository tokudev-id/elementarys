import { test, expect } from "./fixtures";
import { mobileViewports, expectNoPageOverflow, expectTouchTarget } from "./helpers/mobile";
import { openAccount } from "./helpers/shell";

test("shell groups menus by role and reflows into rail and bottom navigation", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("guru@example.test");
  await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hari ini", exact: true })).toBeVisible();
  await expect(
    page.locator(".shell-school-name").getByText("Sekolah Contoh", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Data uji", { exact: true })).toBeVisible();
  const expectedDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  await expect(page.locator("time:visible")).toHaveAttribute("datetime", expectedDate);
  const nav = page.getByRole("navigation", { name: "Navigasi sekolah", exact: true });
  await expect(nav.getByRole("link")).toHaveCount(7);
  await expect(nav.getByRole("link", { name: "Hari ini", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  for (const viewport of mobileViewports) {
    await page.setViewportSize(viewport);
    await expectNoPageOverflow(page);
    await expectTouchTarget(
      page,
      ".shell-menu-link, .shell-topbar button, .shell-bottom-nav button",
    );
    if (viewport.width < 640) {
      await expect(
        page.getByRole("navigation", { name: "Navigasi utama", exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Lainnya", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Menu sekolah", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "Kalender", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "Audit", exact: true })).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Lainnya", exact: true })).toBeFocused();
    } else if (viewport.width >= 1024) {
      await page.getByRole("button", { name: "Ciutkan sidebar", exact: true }).click();
      await expectNoPageOverflow(page);
      await page.getByRole("button", { name: "Perluas sidebar", exact: true }).click();
    } else {
      await page.getByRole("button", { name: "Buka menu", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Menu sekolah", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
    }
  }
  await page.getByRole("link", { name: "Langsung ke isi halaman", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await openAccount(page);
  await expect(page.getByText("Guru Contoh · Guru", { exact: true })).toBeVisible();
  await page.getByRole("menuitem", { name: "Ganti password", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Ganti password", exact: true })).toBeVisible();
});
