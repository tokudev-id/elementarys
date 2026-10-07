import { required, restore } from "./core";
try {
  const result = await restore(
    required("RESTORE_FILE"),
    required("RESTORE_AGE_IDENTITY"),
    required("RESTORE_DATABASE_URL"),
  );
  console.log(JSON.stringify(result));
} catch {
  console.error(
    "Restore gagal. Target wajib DB uji lokal baru; periksa arsip, identity dan client PostgreSQL.",
  );
  process.exitCode = 1;
}
