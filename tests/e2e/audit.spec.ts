import { logout, navigate } from "./helpers/shell";
import { test, expect } from "./fixtures";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { assertLocalTestDatabase } from "../../src/server/db/safety";
import { expectNoPageOverflow } from "./helpers/mobile";
test("admin filters, pages and opens audit snapshots while teacher is denied", async ({ page }) => {
  test.setTimeout(60000);
  assertLocalTestDatabase(process.env.DATABASE_URL!);
  const source = new Pool({ connectionString: process.env.DATABASE_URL });
  const entityId = randomUUID();
  try {
    const actor = (
      await source.query("SELECT id,name FROM \"user\" WHERE email='admin@example.test'")
    ).rows[0];
    for (let index = 0; index < 25; index++)
      await source.query(
        "INSERT INTO audit_events(actor_id,action,entity_type,entity_id,request_id,changes_json,reason) VALUES($1,'student.update','student',$2,$3,$4,'Uji audit sintetis')",
        [
          actor.id,
          entityId,
          randomUUID(),
          {
            actorName: actor.name,
            before: { code: `OLD-${index}` },
            after: { code: `NEW-${index}` },
          },
        ],
      );
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
    await page.getByLabel("Password", { exact: true }).fill("SyntheticTest123!");
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Hari ini", exact: true })).toBeVisible();
    await navigate(page, "Audit");
    await page.getByLabel("Jenis entitas", { exact: true }).selectOption("student");
    await page.getByLabel("ID entitas (opsional)", { exact: true }).fill(entityId);
    await page.getByLabel("Pelaku perubahan", { exact: true }).selectOption(actor.id);
    await page.getByRole("button", { name: "Tampilkan audit", exact: true }).click();
    await expect(page.locator(".audit-list > li")).toHaveCount(20);
    await page.locator(".audit-list details summary").first().click();
    await expect(page.locator(".audit-json").first()).toContainText("OLD-");
    await expect(page.locator(".audit-json").nth(1)).toContainText("NEW-");
    await page.getByRole("link", { name: "Catatan berikutnya", exact: true }).click();
    await expect(page.locator(".audit-list > li")).toHaveCount(5);
    await page.getByRole("link", { name: "Kembali ke halaman pertama", exact: true }).click();
    await expect(page.locator(".audit-list > li")).toHaveCount(20);
    await page.getByLabel("Dari tanggal", { exact: true }).fill("2000-01-01");
    await page.getByLabel("Sampai tanggal", { exact: true }).fill("2000-01-02");
    await page.getByRole("button", { name: "Tampilkan audit", exact: true }).click();
    await expect(
      page.getByText("Tidak ada catatan yang cocok dengan filter ini.", { exact: true }),
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
    await expect(page.getByRole("heading", { name: "Hari ini", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Audit", exact: true })).toHaveCount(0);
    expect((await page.request.get("/api/audit")).status()).toBe(403);
    await page.goto("/audit");
    await expect(page.getByRole("heading", { name: "Hari ini", exact: true })).toBeVisible();
  } finally {
    await source.end();
  }
});
