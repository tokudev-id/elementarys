import { test, expect } from "./fixtures";
import { expectNoPageOverflow } from "./helpers/mobile";
import * as fs from "node:fs";
import * as path from "node:path";

const afterDir = path.resolve(process.cwd(), "docs/redesign/after/UI-R3");

test.beforeAll(() => {
  if (!fs.existsSync(afterDir)) {
    fs.mkdirSync(afterDir, { recursive: true });
  }
});

test("Beranda Admin: KPI cards, kelas belum dicatat, dan pintasan cepat", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();

  // Buka beranda via menu atau URL
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Beranda", exact: true })).toBeVisible();

  // Verifikasi 4 KPI cards
  const kpiSection = page.getByRole("region", { name: "Ringkasan indikator kinerja" });
  await expect(kpiSection).toBeVisible();
  await expect(kpiSection.getByText("Kehadiran hari ini")).toBeVisible();
  await expect(kpiSection.getByText("Kelas sudah dicatat")).toBeVisible();
  await expect(kpiSection.getByText("Siswa aktif")).toBeVisible();
  await expect(kpiSection.getByText("Tidak hadir hari ini")).toBeVisible();

  // Verifikasi card "Belum dicatat hari ini"
  const unrecordedCard = page.locator("#card-belum-dicatat");
  await expect(unrecordedCard).toBeVisible();

  // Verifikasi card "Pintasan cepat"
  const quickActions = page.locator("#card-pintasan");
  await expect(quickActions).toBeVisible();
  await expect(quickActions.getByRole("link", { name: "Rekap bulan ini" })).toBeVisible();
  await expect(quickActions.getByRole("link", { name: "Presensi harian" })).toBeVisible();
  await expect(quickActions.getByRole("link", { name: "Kalender sekolah" })).toBeVisible();
  await expect(quickActions.getByRole("link", { name: "Tambah siswa" })).toBeVisible();
  await expect(quickActions.getByRole("link", { name: "Pengaturan sekolah" })).toBeVisible();

  // Screenshot desktop
  await page.screenshot({
    path: path.join(afterDir, "dashboard-admin-desktop.png"),
    fullPage: true,
  });

  // Viewport mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expectNoPageOverflow(page);
  await page.screenshot({
    path: path.join(afterDir, "dashboard-admin-mobile.png"),
    fullPage: true,
  });
});

test("Guru diarahkan ke Absensi ketika membuka root /", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("guru@example.test");
  await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();
  expect(page.url()).toContain("/attendance");
});

test("Rekap Bulanan: satu kelas per tampilan, KPI kelas, legend chips, dan sticky totals", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("guru@example.test");
  await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();

  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Rekap bulanan", exact: true })).toBeVisible();

  // Filter form memakai noValidate
  const form = page.locator("form.report-filter-bar");
  await expect(form).toHaveAttribute("novalidate", "");

  // Hanya 1 card rekap kelas yang dirender secara default (bukan seluruh kelas ditumpuk)
  const classCards = page.locator("[id^='rekap-kelas-']");
  await expect(classCards).toHaveCount(1);

  // Verifikasi KPI kelas
  const firstCard = classCards.first();
  await expect(firstCard.locator(".report-kpi-grid")).toBeVisible();
  await expect(firstCard.getByText("Rata-rata kehadiran")).toBeVisible();
  await expect(firstCard.getByText("Total Sakit (S)")).toBeVisible();
  await expect(firstCard.getByText("Total Izin (I)")).toBeVisible();
  await expect(firstCard.getByText("Total Alpa (A)")).toBeVisible();

  // Verifikasi legend chips
  const legendChips = firstCard.locator(".report-legend-chips");
  await expect(legendChips).toBeVisible();
  await expect(legendChips.getByText("Hadir")).toBeVisible();
  await expect(legendChips.getByText("Sakit")).toBeVisible();
  await expect(legendChips.getByText("Izin")).toBeVisible();
  await expect(legendChips.getByText("Alpa")).toBeVisible();

  // Verifikasi kolom total H, S, I, A di sebelah kiri setelah nama siswa
  const table = firstCard.locator(".report-sticky-table");
  await expect(table).toBeVisible();
  const headers = table.locator("thead th");
  await expect(headers.nth(0)).toHaveText("Siswa");
  await expect(headers.nth(1)).toHaveText("H");
  await expect(headers.nth(2)).toHaveText("S");
  await expect(headers.nth(3)).toHaveText("I");
  await expect(headers.nth(4)).toHaveText("A");

  await page.screenshot({
    path: path.join(afterDir, "reports-single-class-desktop.png"),
    fullPage: true,
  });

  // Mobile view test
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/reports");
  await expectNoPageOverflow(page);

  // Di mobile tampilkan daftar kartu siswa
  const mobileTotals = page.locator(".report-mobile-totals");
  await expect(mobileTotals).toBeVisible();
  await page.screenshot({ path: path.join(afterDir, "reports-mobile-totals.png"), fullPage: true });

  // Tabel per tanggal tetap tersedia di mobile dengan horizontal scroll
  const mobileTable = page.locator(".report-table-scroll");
  await expect(mobileTable).toBeVisible();
  await page.screenshot({ path: path.join(afterDir, "reports-mobile-table.png"), fullPage: true });
});
