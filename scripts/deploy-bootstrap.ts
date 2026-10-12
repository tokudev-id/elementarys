import { config } from "dotenv";
import { Pool } from "pg";
import { bootstrapManagedAdmin } from "../src/server/auth/bootstrap";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

async function main() {
  const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL;
  const email = process.env.BOOTSTRAP_EMAIL;
  const name = process.env.BOOTSTRAP_NAME || "Administrator";
  const password = process.env.BOOTSTRAP_PASSWORD;

  if (!url || !secret || !baseURL || !email || !password) {
    console.error(`\x1b[31m[ERROR] Konfigurasi bootstrap admin belum lengkap.\x1b[0m\n`);
    console.log(`Status variabel environment:`);
    console.log(`- DATABASE_URL: ${url ? "✔ Terisi" : "❌ Belum diisi"}`);
    console.log(`- BETTER_AUTH_SECRET: ${secret ? "✔ Terisi" : "❌ Belum diisi"}`);
    console.log(
      `- BETTER_AUTH_URL: ${baseURL ? "✔ Terisi" : "❌ Belum diisi"} (contoh: https://nama-app.vercel.app)`,
    );
    console.log(`- BOOTSTRAP_EMAIL: ${email ? "✔ Terisi" : "❌ Belum diisi"}`);
    console.log(
      `- BOOTSTRAP_PASSWORD: ${password ? (password.length >= 12 ? "✔ Terisi" : "❌ Terlalu pendek (<12 char)") : "❌ Belum diisi (minimal 12 karakter)"}`,
    );
    console.log(`- BOOTSTRAP_NAME: ${name} (default: Administrator)\n`);
    console.log(`Contoh eksekusi PowerShell:`);
    console.log(
      `  $env:DATABASE_URL="postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require"`,
    );
    console.log(`  $env:BETTER_AUTH_SECRET="secret-anda-min-32-karakter"`);
    console.log(`  $env:BETTER_AUTH_URL="https://app-anda.vercel.app"`);
    console.log(`  $env:BOOTSTRAP_EMAIL="admin@sekolah.sch.id"`);
    console.log(`  $env:BOOTSTRAP_PASSWORD="PasswordKuat123!"`);
    console.log(`  pnpm auth:bootstrap\n`);
    process.exit(1);
  }

  if (password.length < 12) {
    console.error(`\x1b[31m[ERROR] BOOTSTRAP_PASSWORD harus minimal 12 karakter.\x1b[0m`);
    process.exit(1);
  }

  const source = new Pool({ connectionString: url, max: 1 });
  try {
    console.log(`Membuat akun admin awal untuk ${email}...`);
    const result = await bootstrapManagedAdmin(
      source,
      { secret, baseURL },
      {
        email,
        name,
        password,
        teacherId: process.env.BOOTSTRAP_TEACHER_ID || undefined,
      },
    );
    console.log(`\x1b[32m✔ Akun admin berhasil dibuat!\x1b[0m (ID: ${result.id})`);
    console.log(`Silakan login ke aplikasi (${baseURL}/login) menggunakan email: ${email}`);
  } finally {
    await source.end();
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\x1b[31m[ERROR] Pembuatan admin gagal:\x1b[0m`, message);
  process.exit(1);
});
