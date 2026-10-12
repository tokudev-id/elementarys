import { test, expect } from "./fixtures";
import { Pool } from "pg";
import { assertLocalTestDatabase } from "../../src/server/db/safety";
import { expectNoPageOverflow } from "./helpers/mobile";

test("UI-F1: sticky topbar, sidebar collapse at bottom, DataCard on master pages, and mobile actions", async ({
  page,
}) => {
  assertLocalTestDatabase(process.env.DATABASE_URL!);
  const source = new Pool({ connectionString: process.env.DATABASE_URL });
  let classId: string;
  try {
    const year = (await source.query("SELECT id FROM academic_years WHERE is_current")).rows[0].id;
    classId = (
      await source.query("SELECT id FROM classes WHERE academic_year_id=$1 LIMIT 1", [year])
    ).rows[0].id;
  } finally {
    await source.end();
  }

  // 1. Login
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();

  // 2. Desktop 1440: Topbar sticky after scroll & sidebar collapse position
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/students");
  await expect(page.locator(".data-card")).toBeVisible();

  // Sidebar collapse is at bottom (below menu)
  const menuBox = await page.locator(".shell-sidebar-nav").boundingBox();
  const collapseBox = await page
    .getByRole("button", { name: "Ciutkan sidebar", exact: true })
    .boundingBox();
  expect(menuBox).not.toBeNull();
  expect(collapseBox).not.toBeNull();
  expect(collapseBox!.y).toBeGreaterThan(menuBox!.y);

  // Topbar sticky after scroll on 1440
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(100);
  let topbarBox = await page.locator("header.shell-topbar").boundingBox();
  expect(topbarBox?.y).toBe(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "docs/redesign/after/UI-F1/siswa-1440.png", fullPage: true });

  // 3. Tablet 768: Topbar sticky after scroll
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(100);
  topbarBox = await page.locator("header.shell-topbar").boundingBox();
  expect(topbarBox?.y).toBe(0);

  // 4. Mobile 390: Topbar sticky after scroll, no overflow, responsive header actions
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(100);
  topbarBox = await page.locator("header.shell-topbar").boundingBox();
  expect(topbarBox?.y).toBe(0);

  await page.evaluate(() => window.scrollTo(0, 0));
  await expectNoPageOverflow(page);
  await page.screenshot({ path: "docs/redesign/after/UI-F1/siswa-390.png", fullPage: true });

  // On 390, "Tambah siswa" is visible, secondary action is inside ⋯ menu
  await expect(page.getByRole("link", { name: "Tambah siswa", exact: true })).toBeVisible();
  const moreActions = page.getByRole("button", { name: "Aksi lainnya", exact: true });
  await expect(moreActions).toBeVisible();
  await moreActions.click();
  await expect(
    page.getByRole("menuitem", { name: "Naik kelas / penempatan", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  // Mobile filter sheet works
  const filterBtn = page.getByRole("button", { name: /Buka filter daftar/ });
  await expect(filterBtn).toBeVisible();
  await filterBtn.click();
  await expect(page.getByRole("dialog", { name: "Filter daftar", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Selesai", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Filter daftar" })).toBeHidden();

  // 5. Teachers (both tabs use DataCard)
  await page.goto("/teachers");
  await expect(page.locator(".data-card")).toBeVisible();
  await expect(page.locator(".data-card__title")).toContainText("Profil guru");

  await page.getByRole("link", { name: "Akun tanpa profil", exact: true }).click();
  await expect(page.locator(".data-card")).toBeVisible();
  await expect(page.locator(".data-card__title")).toContainText("Akun tanpa profil");

  // 6. Classes
  await page.goto("/classes");
  await expect(page.locator(".data-card")).toBeVisible();
  await expect(page.locator(".data-card__title")).toContainText("Kelas");

  // 7. Class Detail
  await page.goto(`/classes/${classId}`);
  await expect(page.locator(".data-card")).toBeVisible();
  await expect(page.locator(".data-card__title")).toContainText("Siswa aktif");
  await expect(page.getByRole("link", { name: "Catat absensi", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Rekap kelas", exact: true })).toBeVisible();

  // 8. Mobile detail back button
  await page.setViewportSize({ width: 390, height: 844 });
  const backBtn = page.locator("header.shell-topbar .shell-mobile-back");
  await expect(backBtn).toBeVisible();
  await backBtn.click();
  await expect(page).toHaveURL(/\/classes$/);
});
