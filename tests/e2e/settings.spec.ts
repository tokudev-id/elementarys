import { test, expect, type Page } from "./fixtures";
import { expectNoPageOverflow } from "./helpers/mobile";
async function login(page: Page, email = "admin@example.test") {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();
}
for (const width of [360, 768, 1024]) {
  test(`settings preview validation and save ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await login(page);
    await page.goto("/settings");
    await page.getByLabel("Zona waktu", { exact: true }).fill("Invalid/School");
    await expect(page.locator(".resource-form p")).toContainText("Zona waktu belum valid");
    await page.getByRole("button", { name: "Simpan identitas sekolah", exact: true }).click();
    await expect(page.getByLabel("Zona waktu", { exact: true })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await page.getByLabel("Zona waktu", { exact: true }).fill("Asia/Kuala_Lumpur");
    await page.getByLabel("Lokasi sekolah", { exact: true }).fill("Lingkungan uji");
    await page.getByRole("button", { name: "Simpan identitas sekolah", exact: true }).click();
    await expect(page.getByText("Tersimpan", { exact: true })).toBeVisible();
    await expectNoPageOverflow(page);
    await page.goto("/setup");
    await expect(page.getByText("Persiapan minimum lengkap.", { exact: true })).toBeVisible();
  });
}
test("teacher cannot mutate settings", async ({ page }) => {
  await login(page, "guru@example.test");
  await page.goto("/settings");
  await expect(
    page.getByRole("button", { name: "Simpan identitas sekolah", exact: true }),
  ).toHaveCount(0);
  const response = await page.request.patch("/api/settings", {
    headers: { Origin: process.env.BETTER_AUTH_URL! },
    data: {},
  });
  expect(response.status()).toBe(403);
});
test("stale settings reload the latest fields", async ({ page, browser }) => {
  await login(page);
  await page.goto("/settings");
  const context = await browser.newContext();
  const second = await context.newPage();
  await login(second);
  await second.goto("/settings");
  await page.getByLabel("Lokasi sekolah", { exact: true }).fill("Lokasi yang terbaru");
  await page.getByRole("button", { name: "Simpan identitas sekolah", exact: true }).click();
  await expect(page.getByText("Tersimpan", { exact: true })).toBeVisible();
  await second.getByLabel("Lokasi sekolah", { exact: true }).fill("Isian lama");
  await second.getByRole("button", { name: "Simpan identitas sekolah", exact: true }).click();
  await expect(second.getByRole("alert").filter({ hasText: "Data telah berubah" })).toBeVisible();
  await second.getByRole("button", { name: "Muat data terbaru", exact: true }).click();
  await expect(second.getByLabel("Lokasi sekolah", { exact: true })).toHaveValue(
    "Lokasi yang terbaru",
  );
  await context.close();
});
