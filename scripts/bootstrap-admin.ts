import { config } from "dotenv";
import { Pool } from "pg";
import { bootstrapManagedAdmin } from "../src/server/auth/bootstrap";
import { assertLocalTestDatabase } from "../src/server/db/safety";
config({ path: ".env.local", quiet: true });
async function bootstrap() {
  const {
    DATABASE_URL,
    BETTER_AUTH_SECRET,
    BETTER_AUTH_URL,
    BOOTSTRAP_EMAIL,
    BOOTSTRAP_NAME,
    BOOTSTRAP_PASSWORD,
  } = process.env;
  if (
    !DATABASE_URL ||
    !BETTER_AUTH_SECRET ||
    !BETTER_AUTH_URL ||
    !BOOTSTRAP_EMAIL ||
    !BOOTSTRAP_NAME ||
    !BOOTSTRAP_PASSWORD ||
    BOOTSTRAP_PASSWORD.length < 12
  )
    throw new Error(
      "Isi konfigurasi dan credential bootstrap melalui environment aman (password minimal 12 karakter).",
    );
  if (process.env.APP_ENV !== "test")
    throw new Error(
      "Bootstrap produksi dijalankan operator melalui runbook rilis, belum diaktifkan pada tahap ini.",
    );
  assertLocalTestDatabase(DATABASE_URL);
  const source = new Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    await bootstrapManagedAdmin(
      source,
      { secret: BETTER_AUTH_SECRET, baseURL: BETTER_AUTH_URL },
      {
        email: BOOTSTRAP_EMAIL,
        name: BOOTSTRAP_NAME,
        password: BOOTSTRAP_PASSWORD,
        teacherId: process.env.BOOTSTRAP_TEACHER_ID || undefined,
      },
    );
    console.log("Admin awal dibuat; password wajib diganti saat masuk.");
  } finally {
    await source.end();
  }
}
bootstrap().catch(() => {
  console.error(
    "Bootstrap gagal. Periksa konfigurasi, target uji lokal, dan profil; admin aktif yang sudah ada harus dikelola melalui aplikasi.",
  );
  process.exitCode = 1;
});
