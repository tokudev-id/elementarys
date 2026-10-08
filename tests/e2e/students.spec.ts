import { logout } from "./helpers/shell";
import { test, expect } from "./fixtures";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { assertLocalTestDatabase } from "../../src/server/db/safety";
import { schoolToday } from "../../src/domain/calendar";
import { expectNoPageOverflow } from "./helpers/mobile";
test("admin enters ten students on mobile, filters and edits identity; teacher cannot create", async ({
  page,
}) => {
  assertLocalTestDatabase(process.env.DATABASE_URL!);
  const source = new Pool({ connectionString: process.env.DATABASE_URL });
  const tag = randomUUID().slice(0, 8);
  let name: string;
  try {
    const year = (await source.query("SELECT id FROM academic_years WHERE is_current")).rows[0].id;
    name = `Kelas Input ${tag}`;
    await source.query("INSERT INTO classes(academic_year_id,grade,name) VALUES($1,1,$2)", [
      year,
      name,
    ]);
  } finally {
    await source.end();
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();
  await page.goto("/students");
  const form = page.getByTestId("student-create");
  for (let index = 1; index <= 10; index++) {
    await page.goto("/students/new");
    await form
      .getByLabel("Nama lengkap siswa", { exact: true })
      .fill(`Siswa Input ${tag} ${index}`);
    await form
      .getByLabel("Kelas awal", { exact: true })
      .selectOption({ label: `2026/2027 / ${name!}` });
    await form
      .getByLabel("Tanggal mulai penempatan", { exact: true })
      .fill(schoolToday("Asia/Kuala_Lumpur"));
    await form.getByRole("button", { name: "Tambah siswa", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: `Siswa Input ${tag} ${index}`, exact: true }),
    ).toBeVisible();
  }
  await page.goto("/students");
  await page.getByLabel("Cari nama atau kode siswa", { exact: true }).fill(`Siswa Input ${tag}`);
  await page.getByRole("button", { name: "Tampilkan", exact: true }).click();
  await expect(page.locator(".master-mobile .mobile-card-list > li")).toHaveCount(10);
  await page.getByRole("link", { name: `Siswa Input ${tag} 1`, exact: true }).click();
  await expect(
    page.getByRole("heading", { name: `Siswa Input ${tag} 1`, exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ubah", exact: true }).click();
  await page.getByLabel("Nama lengkap siswa", { exact: true }).fill(`Siswa Koreksi ${tag}`);
  await page.getByRole("button", { name: "Simpan identitas siswa", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: `Siswa Koreksi ${tag}`, exact: true }),
  ).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();
  await page.goto("/students");
  await expect(page.getByTestId("student-create")).toHaveCount(0);
  expect(
    (
      await page.request.post("/api/students", {
        headers: { Origin: process.env.BETTER_AUTH_URL! },
        data: {},
      })
    ).status(),
  ).toBe(403);
});
