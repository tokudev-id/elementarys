import { test, expect } from "@playwright/test";

for (const width of [360, 768, 1024]) {
  test(`halaman awal ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Absensi Sekolah" })).toBeVisible();
    await expect(page.getByText("Aplikasi sedang disiapkan.", { exact: false })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/scaffold-${width}.png`, fullPage: true });
  });
}

test("health tidak membutuhkan database", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ status: "ok" });
  expect(response.headers()["cache-control"]).toBe("no-store");
});
