import { backup, backupStore, required } from "./core";
try {
  const name = await backup(required("BACKUP_DATABASE_URL"), required("BACKUP_AGE_RECIPIENT"), backupStore());
  console.log(`Backup terenkripsi tersimpan: ${name}`);
} catch {
  console.error("Backup gagal. Periksa konfigurasi runner, client PostgreSQL, age dan tujuan penyimpanan.");
  process.exitCode = 1;
}
