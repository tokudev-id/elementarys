import { config } from "dotenv";
import { migrateDatabase } from "../src/server/db/migrate";
import { assertLocalTestDatabase } from "../src/server/db/safety";
config({ path: ".env.local", quiet: true });
const url = process.env.DATABASE_MIGRATION_URL;
if (!url) throw new Error("DATABASE_MIGRATION_URL wajib diisi.");
assertLocalTestDatabase(url);
await migrateDatabase(url);
console.log("Migrasi database uji selesai.");
