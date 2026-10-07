import { test, expect } from "@playwright/test";
import { expectNoPageOverflow } from "./helpers/mobile";

for (const width of [360, 768, 1024]) {
  test(`rekap filter dan tabel terpisah ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill("guru@example.test");
    await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await page.getByRole("link", { name: "Rekap", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Rekap bulanan", exact: true })).toBeVisible();
    await page
      .getByLabel("Kelas", { exact: true })
      .selectOption({ label: "2026/2027 / Kelas 1 Contoh" });
    await page.getByRole("button", { name: "Tampilkan rekap", exact: true }).click();
    await expectNoPageOverflow(page);
    const table = page.getByRole("region", { name: "Tabel tanggal Kelas 1 Contoh" });
    await expect(table).toBeVisible();
    await expect(page.locator(".report-totals-list li")).toHaveCount(10);
    await table.focus();
    await page.keyboard.press("ArrowRight");
    await expectNoPageOverflow(page);
    await page.screenshot({ path: `test-results/reports-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}
test("rekap api requires a session", async ({ request }) => {
  const response = await request.get("/api/reports/attendance");
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
});
