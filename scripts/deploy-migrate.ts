import { config } from "dotenv";
import { migrateDatabase } from "../src/server/db/migrate";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

async function main() {
  const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error(
      `\x1b[31m[ERROR] DATABASE_MIGRATION_URL atau DATABASE_URL belum diatur.\x1b[0m\n`,
    );
    console.log(`Silakan jalankan dengan menyertakan connection string database target:`);
    console.log(
      `  PowerShell : $env:DATABASE_URL="postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require"; pnpm db:migrate:deploy`,
    );
    console.log(
      `  Bash / Mac : DATABASE_URL="postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require" pnpm db:migrate:deploy\n`,
    );
    console.log(`Tips untuk Neon PostgreSQL:`);
    console.log(`- Gunakan Direct Connection (host tanpa "-pooler") untuk proses migrasi DDL.`);
    process.exit(1);
  }

  let sanitizedUrl = url;
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = "******";
      sanitizedUrl = parsed.toString();
    }
  } catch {
    // biarkan apa adanya jika URL tidak valid
  }

  console.log(`Menghubungkan ke database: ${sanitizedUrl}`);
  console.log(`Menjalankan migrasi Drizzle...`);

  const startTime = Date.now();
  await migrateDatabase(url);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\x1b[32m✔ Migrasi skema database berhasil selesai dalam ${duration}s!\x1b[0m`);
  console.log(`Semua tabel (auth, core, constraints, rate-limit) siap digunakan.`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\x1b[31m[ERROR] Migrasi gagal:\x1b[0m`, message);
  process.exit(1);
});
