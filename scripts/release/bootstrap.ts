import { Pool } from "pg";
import { releaseTarget } from "./target";
import { bootstrapManagedAdmin } from "../../src/server/auth/bootstrap";
async function main() {
  const { url } = await releaseTarget("bootstrap");
  const source = new Pool({ connectionString: url, max: 1 });
  try {
    const secret = process.env.BETTER_AUTH_SECRET;
    const baseURL = process.env.BETTER_AUTH_URL;
    if (!secret || !baseURL || !baseURL.startsWith("https://"))
      throw new Error("Auth TLS belum tersedia.");
    await bootstrapManagedAdmin(
      source,
      { secret, baseURL },
      {
        email: process.env.BOOTSTRAP_EMAIL,
        name: process.env.BOOTSTRAP_NAME,
        password: process.env.BOOTSTRAP_PASSWORD,
        teacherId: process.env.BOOTSTRAP_TEACHER_ID || undefined,
      },
    );
    console.log(
      "Admin awal target yang dikonfirmasi dibuat; wajib ganti password sebelum mengelola sekolah.",
    );
  } finally {
    await source.end();
  }
}
main().catch(() => {
  console.error(
    "Bootstrap rilis gagal. Periksa manifest, konfirmasi, auth, akun dan profil melalui runbook; credential tidak dicetak.",
  );
  process.exitCode = 1;
});
