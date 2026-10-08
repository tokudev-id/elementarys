import { test, expect } from "./fixtures";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { assertLocalTestDatabase } from "../../src/server/db/safety";
import { schoolToday } from "../../src/domain/calendar";
import { expectNoPageOverflow } from "./helpers/mobile";

test("admin transfers, cancels a future placement, closes and archives a student, then previews and applies a promotion batch", async ({
  page,
}) => {
  test.setTimeout(60000);
  assertLocalTestDatabase(process.env.DATABASE_URL!);
  const source = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const tag = randomUUID().slice(0, 8);
    const context = (await source.query("SELECT timezone FROM school_config")).rows[0];
    const today = schoolToday(context.timezone);
    const yesterday = new Date(`${today}T12:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const effective = yesterday.toISOString().slice(0, 10);
    const year = (await source.query("SELECT id FROM academic_years WHERE is_current")).rows[0].id;
    const next = (
      await source.query(
        "INSERT INTO academic_years(label,starts_on,ends_on_exclusive) VALUES($1,'2027-01-01','2028-01-01') RETURNING id",
        [`Naik ${tag}`],
      )
    ).rows[0].id;
    const classes: string[] = [];
    for (const [index, label] of ["Asal", "Tujuan", "Batch", "Baru"].entries())
      classes.push(
        (
          await source.query(
            "INSERT INTO classes(academic_year_id,grade,name) VALUES($1,$2,$3) RETURNING id",
            [index === 3 ? next : year, index === 3 ? 2 : 1, `${label} ${tag}`],
          )
        ).rows[0].id,
      );
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
    await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Absensi", exact: true })).toBeVisible();
    const created = [];
    for (let index = 0; index < 3; index++) {
      const response = await page.request.post("/api/students", {
        headers: { origin: process.env.BETTER_AUTH_URL! },
        data: {
          fullName: `Lifecycle ${tag} ${index}`,
          nis: null,
          nisn: null,
          classId: index === 0 ? classes[0] : classes[2],
          startsOn: "2026-01-01",
        },
      });
      expect(response.status()).toBe(200);
      created.push((await response.json()).id as string);
    }
    await page.goto(`/students/${created[0]}`);
    async function openAction(name: string) {
      await page.getByRole("button", { name: "Aksi siswa", exact: true }).click();
      await page.getByRole("menuitem", { name, exact: true }).click();
    }
    await openAction("Pindah kelas");
    const placement = page.getByRole("form", { name: "Ubah penempatan siswa", exact: true });
    await placement.getByLabel("Kelas tujuan", { exact: true }).selectOption(classes[1]);
    await placement.getByLabel("Mulai di kelas tujuan", { exact: true }).fill(effective);
    await placement
      .getByLabel("Alasan penempatan", { exact: true })
      .fill("Pindah kelas efektif kemarin");
    await placement.getByRole("button", { name: "Simpan penempatan", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.getByRole("tab", { name: "Riwayat penempatan", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Riwayat penempatan", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".placement-timeline > li")).toHaveCount(2);
    await openAction("Pindah kelas");
    await placement.getByLabel("Jenis perubahan", { exact: true }).selectOption("placement");
    await placement.getByLabel("Kelas tujuan", { exact: true }).selectOption(classes[3]);
    await placement.getByLabel("Mulai di kelas tujuan", { exact: true }).fill("2027-01-01");
    await placement
      .getByLabel("Alasan penempatan", { exact: true })
      .fill("Rencana tahun berikutnya");
    await placement.getByRole("button", { name: "Simpan penempatan", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await openAction("Tutup penempatan");
    const future = page.getByRole("form", { name: `Tutup penempatan Baru ${tag}`, exact: true });
    await future
      .getByLabel("Alasan pembatalan penempatan", { exact: true })
      .fill("Rencana dibatalkan");
    await future
      .getByRole("button", { name: "Batalkan penempatan mendatang", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("Dibatalkan sebelum mulai", { exact: true })).toBeVisible();
    await openAction("Tutup penempatan");
    const current = page.getByRole("form", { name: `Tutup penempatan Tujuan ${tag}`, exact: true });
    await current.getByLabel("Tidak bersekolah mulai tanggal", { exact: true }).fill(today);
    await current.getByLabel("Alasan siswa keluar", { exact: true }).fill("Siswa keluar hari ini");
    await current.getByRole("button", { name: "Tutup penempatan", exact: true }).click();
    await expect(current).toHaveCount(0);
    await openAction("Arsipkan siswa");
    const archive = page.getByRole("form", { name: "Status arsip siswa", exact: true });
    await archive.getByLabel("Alasan status siswa", { exact: true }).fill("Arsip setelah keluar");
    await archive.getByRole("button", { name: "Arsipkan siswa", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.getByRole("tab", { name: "Ringkasan", exact: true }).click();
    await expect(
      page.getByText("Siswa diarsipkan. Riwayat tetap tersedia.", { exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Kembali ke siswa", exact: true }).click();
    await page.getByLabel("Cari nama atau kode siswa", { exact: true }).fill(`Lifecycle ${tag} 0`);
    await page.getByLabel("Status siswa", { exact: true }).selectOption("all");
    await page.getByRole("button", { name: "Tampilkan", exact: true }).click();
    await expect(page.getByRole("link", { name: `Lifecycle ${tag} 0`, exact: true })).toBeVisible();
    await page.goto(`/students/promote?classId=${classes[2]}`);
    await page.getByLabel("Kelas tujuan batch", { exact: true }).selectOption(classes[3]);
    await page.getByLabel("Tanggal mulai tahun berikutnya", { exact: true }).fill("2027-01-01");
    await page.getByLabel("Alasan batch penempatan", { exact: true }).fill("Naik kelas bersama");
    await page.getByRole("button", { name: "Lanjut: pilih siswa", exact: true }).click();
    for (let index = 1; index <= 2; index++)
      await page.getByRole("checkbox", { name: new RegExp(`Lifecycle ${tag} ${index}`) }).check();
    await page.getByRole("button", { name: "Periksa preview", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Hasil preview per siswa", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Siap: Siap ditempatkan; penempatan lama tetap tersimpan.", { exact: true }),
    ).toHaveCount(2);
    await page.getByRole("button", { name: "Simpan seluruh batch", exact: true }).click();
    await expect(
      page.getByText("Seluruh 2 siswa berhasil ditempatkan.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Hasil batch", exact: true }).getByRole("listitem"),
    ).toHaveCount(2);
    for (const width of [360, 768, 1024]) {
      await page.setViewportSize({ width, height: 800 });
      await expectNoPageOverflow(page);
    }
    await page.setViewportSize({ width: 360, height: 800 });
    await page.screenshot({ path: "test-results/promotion-360.png", fullPage: true });
  } finally {
    await source.end();
  }
});
