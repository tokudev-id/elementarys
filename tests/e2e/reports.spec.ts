import { test, expect } from "./fixtures";
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
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Unduh Excel", exact: true }).click();
    expect((await download).suggestedFilename()).toMatch(/rekap-\d{4}-\d{2}\.xlsx/);
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
  expect((await request.get("/api/reports/attendance.xlsx")).status()).toBe(401);
});

test("unduhan gagal memberi pesan dan dapat dicoba kembali", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("guru@example.test");
  await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();
  await page.goto("/reports");
  await page.route("**/api/reports/attendance.xlsx?*", (route) => route.abort("failed"));
  await page.getByRole("button", { name: "Unduh Excel", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Belum dapat mengunduh Excel" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Unduh Excel", exact: true })).toBeEnabled();
  await page.unroute("**/api/reports/attendance.xlsx?*");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Unduh Excel", exact: true }).click();
  expect((await download).suggestedFilename()).toContain(".xlsx");
});
