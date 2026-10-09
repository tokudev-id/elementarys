import { test, expect } from "./fixtures";

test("capture UI-F4 screenshots", async ({ page }) => {
  // 1. Login Page Desktop & Mobile
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Masuk ke Absensi Sekolah" })).toBeVisible();
  await page.screenshot({ path: "docs/redesign/after/UI-F4/login-desktop.png" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "docs/redesign/after/UI-F4/login-mobile.png" });

  // Login as admin
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();

  // 2. Settings Page
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Konfigurasi sekolah" })).toBeVisible();
  await page.screenshot({ path: "docs/redesign/after/UI-F4/settings-desktop.png" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "docs/redesign/after/UI-F4/settings-mobile.png" });

  // 3. Setup Page
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/setup");
  await expect(page.getByRole("heading", { name: "Persiapan sekolah" })).toBeVisible();
  await page.screenshot({ path: "docs/redesign/after/UI-F4/setup-desktop.png" });

  // 4. Calendar Page
  await page.goto("/calendar");
  await expect(page.getByRole("heading", { name: "Kalender akademik" })).toBeVisible();
  await page.screenshot({ path: "docs/redesign/after/UI-F4/calendar-desktop.png" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "docs/redesign/after/UI-F4/calendar-mobile.png" });

  // Open calendar override dialog
  const tambahBtn = page.getByRole("button", { name: "Tambah pengecualian" });
  if (await tambahBtn.isVisible()) {
    await tambahBtn.click();
    await expect(page.getByRole("dialog", { name: "Atur pengecualian tanggal" })).toBeVisible();
    await page.screenshot({ path: "docs/redesign/after/UI-F4/calendar-dialog-mobile.png" });
    await page.keyboard.press("Escape");
  }

  // 5. Academic Years Rollover
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/academic-years/rollover");
  await expect(page.getByRole("heading", { name: "Persiapan tahun ajaran" })).toBeVisible();
  await page.screenshot({ path: "docs/redesign/after/UI-F4/rollover-desktop.png" });

  // 6. Teacher Detail Page
  await page.goto("/teachers");
  const teacherLink = page.locator("a[href^='/teachers/']:not([href='/teachers/new'])").first();
  await expect(teacherLink).toBeVisible();
  await teacherLink.click();
  await expect(page.getByRole("tab", { name: "Profil" })).toBeVisible();
  await page.screenshot({ path: "docs/redesign/after/UI-F4/teacher-detail-desktop.png" });

  // Open classes dialog
  await page.getByRole("tab", { name: "Kelas utama" }).click();
  await page.getByRole("button", { name: "Ubah kelas utama" }).click();
  await expect(page.getByRole("dialog", { name: "Ubah kelas utama guru" })).toBeVisible();
  await page.screenshot({ path: "docs/redesign/after/UI-F4/teacher-classes-dialog.png" });
  await page.keyboard.press("Escape");

  // Open account tab
  await page.getByRole("tab", { name: "Akun & akses" }).click();
  await page.screenshot({ path: "docs/redesign/after/UI-F4/teacher-account-tab.png" });

  // 7. Attendance Roster (Class detail)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/attendance");
  const classLink = page.locator("a[href^='/attendance/']:not([href='/attendance'])").first();
  await expect(classLink).toBeVisible();
  await classLink.click();
  await expect(page.getByTestId("student-row").first()).toBeVisible();
  await page.screenshot({ path: "docs/redesign/after/UI-F4/attendance-mobile.png" });
});
