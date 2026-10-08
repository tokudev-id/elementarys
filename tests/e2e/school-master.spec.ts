import { logout } from "./helpers/shell";
import { test, expect } from "./fixtures";
import { expectNoPageOverflow } from "./helpers/mobile";
test("admin creates year/class and edits calendar on mobile; teacher reads without write controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hari ini", exact: true })).toBeVisible();
  await page.goto("/academic-years");
  const create = page.getByTestId("year-create");
  await create.getByLabel("Nama tahun ajaran", { exact: true }).fill("Tahun Uji 2030");
  await create.getByLabel("Tanggal mulai", { exact: true }).fill("2030-01-01");
  await create.getByLabel("Berakhir sebelum tanggal", { exact: true }).fill("2031-01-01");
  await create.getByRole("button", { name: "Tambah tahun ajaran", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tahun Uji 2030", exact: true })).toBeVisible();
  const editYear = page
    .locator('[data-testid^="year-edit-"]')
    .filter({ has: page.locator('input[name="label"][value="Tahun Uji 2030"]') });
  await editYear.getByLabel("Nama tahun ajaran", { exact: true }).fill("Tahun Uji 2030 Diubah");
  await editYear.getByRole("button", { name: "Simpan tahun ajaran", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tahun Uji 2030 Diubah", exact: true }),
  ).toBeVisible();
  await page.goto("/classes");
  const classForm = page.getByTestId("class-create");
  await classForm.getByLabel("Nama kelas", { exact: true }).fill("Kelas Uji Kalender");
  await classForm
    .getByLabel("Tahun ajaran", { exact: true })
    .selectOption({ label: "Tahun Uji 2030 Diubah" });
  await classForm.getByRole("button", { name: "Tambah kelas", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Kelas Uji Kalender", exact: true }),
  ).toBeVisible();
  const editClass = page
    .locator('[data-testid^="class-edit-"]')
    .filter({ has: page.locator('input[name="name"][value="Kelas Uji Kalender"]') });
  await editClass.getByLabel("Tingkat kelas", { exact: true }).fill("2");
  await editClass.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await expect(page.getByText("Tingkat 2 · Tahun Uji 2030 Diubah", { exact: true })).toBeVisible();
  await page.goto("/calendar");
  await page
    .getByLabel("Tahun ajaran", { exact: true })
    .selectOption({ label: "Tahun Uji 2030 Diubah" });
  await page.getByLabel("Bulan kalender", { exact: true }).fill("2030-01");
  await page.getByRole("button", { name: "Tampilkan kalender", exact: true }).click();
  await page.getByLabel("Senin", { exact: true }).check();
  await page.getByLabel("Kamis", { exact: true }).check();
  await page.getByRole("button", { name: "Simpan hari rutin", exact: true }).click();
  await expect(page.getByText("Tersimpan", { exact: true })).toBeVisible();
  await page.getByLabel("Tanggal pengecualian", { exact: true }).fill("2030-01-01");
  await page.getByLabel("Alasan pengecualian", { exact: true }).fill("Libur sintetis");
  await page.getByRole("button", { name: "Simpan pengecualian", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Hapus pengecualian 2030-01-01", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hapus pengecualian 2030-01-01", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Hapus pengecualian 2030-01-01", exact: true }),
  ).toHaveCount(0);
  for (const width of [360, 768, 1024]) {
    await page.setViewportSize({ width, height: 800 });
    await expectNoPageOverflow(page);
  }
  await logout(page);
  await expect(
    page.getByRole("heading", { name: "Masuk ke Absensi Sekolah", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("guru@example.test");
  await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hari ini", exact: true })).toBeVisible();
  await page.goto("/calendar");
  await expect(page.getByRole("button", { name: "Simpan hari rutin", exact: true })).toHaveCount(0);
  expect(
    (
      await page.request.post("/api/classes", {
        headers: { Origin: process.env.BETTER_AUTH_URL! },
        data: {},
      })
    ).status(),
  ).toBe(403);
});
