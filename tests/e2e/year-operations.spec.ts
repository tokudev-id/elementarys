import { test, expect } from "./fixtures";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { assertLocalTestDatabase } from "../../src/server/db/safety";
import { expectNoPageOverflow } from "./helpers/mobile";
test("year preparation links into batch, confirms activation and preserves archived reports", async ({
  page,
}) => {
  test.setTimeout(60000);
  assertLocalTestDatabase(process.env.DATABASE_URL!);
  const source = new Pool({ connectionString: process.env.DATABASE_URL });
  let previous: string | undefined;
  try {
    previous = (await source.query("SELECT id FROM academic_years WHERE is_current")).rows[0].id;
    const tag = randomUUID().slice(0, 8);
    const old = (
      await source.query(
        "INSERT INTO academic_years(label,starts_on,ends_on_exclusive) VALUES($1,'2018-01-01','2019-01-01') RETURNING id",
        [`Lama ${tag}`],
      )
    ).rows[0].id;
    const next = (
      await source.query(
        "INSERT INTO academic_years(label,starts_on,ends_on_exclusive) VALUES($1,'2031-01-01','2032-01-01') RETURNING id",
        [`Baru ${tag}`],
      )
    ).rows[0].id;
    const origin = (
      await source.query(
        "INSERT INTO classes(academic_year_id,grade,name) VALUES($1,1,$2) RETURNING id",
        [old, `Asal Tahun ${tag}`],
      )
    ).rows[0].id;
    const destination = (
      await source.query(
        "INSERT INTO classes(academic_year_id,grade,name) VALUES($1,2,$2) RETURNING id",
        [next, `Tujuan Tahun ${tag}`],
      )
    ).rows[0].id;
    const student = (
      await source.query(
        "INSERT INTO students(student_code,full_name) VALUES($1,$2) RETURNING id",
        [`YR-${tag}`, `Siswa Tahun ${tag}`],
      )
    ).rows[0].id;
    await source.query(
      "INSERT INTO enrollments(student_id,class_id,starts_on,ends_on_exclusive) VALUES($1,$2,'2018-01-01','2019-01-01')",
      [student, origin],
    );
    await source.query("INSERT INTO school_weekdays SELECT $1,generate_series(1,5)", [old]);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
    await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Hari ini", exact: true })).toBeVisible();
    await page.goto(`/academic-years/rollover?yearId=${next}`);
    await expect(
      page.getByRole("button", { name: "Aktifkan tahun ini", exact: true }),
    ).toBeDisabled();
    await expect(page.getByText("Hari belajar belum diatur.", { exact: true })).toBeVisible();
    await source.query("INSERT INTO school_weekdays SELECT $1,generate_series(1,5)", [next]);
    await page.reload();
    await page.getByLabel("Kelas asal naik kelas", { exact: true }).selectOption(origin);
    await page.getByRole("button", { name: "Buka preview naik kelas", exact: true }).click();
    await expect(page.getByLabel("Kelas tujuan batch", { exact: true })).toHaveValue(destination);
    await expect(page.getByLabel("Tanggal mulai tahun berikutnya", { exact: true })).toHaveValue(
      "2031-01-01",
    );
    await page.getByLabel("Alasan batch penempatan", { exact: true }).fill("Persiapan tahun baru");
    await page.getByRole("checkbox", { name: new RegExp(`Siswa Tahun ${tag}`) }).check();
    await page.getByRole("button", { name: "Periksa preview", exact: true }).click();
    await page.getByRole("button", { name: "Simpan seluruh batch", exact: true }).click();
    await expect(
      page.getByText("Seluruh 1 siswa berhasil ditempatkan.", { exact: true }),
    ).toBeVisible();
    await page.goto(`/academic-years/rollover?yearId=${next}`);
    await page.getByRole("button", { name: "Aktifkan tahun ini", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.getByRole("button", { name: "Aktifkan tahun ini", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Konfirmasi pindah tahun", exact: true })
      .click();
    await expect(page.getByText("Tahun ini sudah aktif.", { exact: true })).toBeVisible();
    const denied = await page.request.patch(`/api/academic-years/${next}`, {
      headers: { origin: process.env.BETTER_AUTH_URL! },
      data: { expectedVersion: 2, archived: true },
    });
    expect(denied.status()).toBe(400);
    const archiveClass = await page.request.patch(`/api/classes/${origin}`, {
      headers: { origin: process.env.BETTER_AUTH_URL! },
      data: { expectedVersion: 1, archived: true },
    });
    expect(archiveClass.status()).toBe(200);
    const archiveYear = await page.request.patch(`/api/academic-years/${old}`, {
      headers: { origin: process.env.BETTER_AUTH_URL! },
      data: { expectedVersion: 1, archived: true },
    });
    expect(archiveYear.status()).toBe(200);
    await page.goto(`/reports?yearId=${old}&classId=${origin}&month=2018-01`);
    await expect(page.getByRole("heading", { name: "Rekap bulanan", exact: true })).toBeVisible();
    await expect(page.getByText(`Siswa Tahun ${tag}`, { exact: true })).toHaveCount(1);
    await expect(
      page.getByRole("rowheader", { name: new RegExp(`Siswa Tahun ${tag}`) }),
    ).toHaveCount(1);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Unduh Excel", exact: true }).click();
    expect((await download).suggestedFilename()).toBe("rekap-2018-01.xlsx");
    for (const width of [360, 768, 1024]) {
      await page.setViewportSize({ width, height: 800 });
      await expectNoPageOverflow(page);
    }
  } finally {
    if (previous) {
      const version = (
        await source.query("SELECT version FROM academic_years WHERE id=$1", [previous])
      ).rows[0].version;
      const response = await page.request.patch(`/api/academic-years/${previous}`, {
        headers: { origin: process.env.BETTER_AUTH_URL! },
        data: { expectedVersion: version, isCurrent: true },
      });
      expect(response.status()).toBe(200);
    }
    await source.end();
  }
});
