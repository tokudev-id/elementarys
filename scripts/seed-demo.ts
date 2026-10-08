import { config } from "dotenv";
import { seedDemoDatabase } from "../src/server/db/seed-demo";

config({ path: ".env.local", quiet: true });
const url = process.env.DATABASE_MIGRATION_URL;
const password = process.env.DEMO_ACCOUNT_PASSWORD;
if (!url || !password || password.length < 12)
  throw new Error(
    "Isi DATABASE_MIGRATION_URL dan DEMO_ACCOUNT_PASSWORD minimal 12 karakter lokal.",
  );
try {
  const result = await seedDemoDatabase(url, password);
  console.log(JSON.stringify({ ...result, synthetic: true }));
} catch {
  console.error(
    "Seed simulasi gagal. Target harus database uji lokal kosong yang sudah dimigrasi.",
  );
  process.exitCode = 1;
}
