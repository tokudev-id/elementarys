import { Pool } from "pg";
import { releaseTarget } from "./target";
import { migrateDatabase } from "../../src/server/db/migrate";
async function main() {
  const { url, target } = await releaseTarget("migrate");
  const source = new Pool({ connectionString: url, max: 1 });
  try {
    const major = Math.floor(
      Number((await source.query("SHOW server_version_num")).rows[0].server_version_num) / 10000,
    );
    if (major !== target.postgresMajor) throw new Error("Major server berbeda dari metadata.");
  } finally {
    await source.end();
  }
  await migrateDatabase(url);
  console.log(
    "Migrasi target yang dikonfirmasi selesai. Verifikasi schema sebelum deploy aplikasi.",
  );
}
main().catch(() => {
  console.error(
    "Migrasi rilis gagal. Periksa manifest, konfirmasi, target, role dan schema; credential dan error SQL tidak dicetak.",
  );
  process.exitCode = 1;
});
