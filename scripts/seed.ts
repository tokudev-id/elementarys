import { config } from "dotenv";
import { seedTestDatabase } from "../src/server/db/seed";
config({ path: ".env.local", quiet: true });
const url = process.env.DATABASE_MIGRATION_URL;
const password = process.env.TEST_ACCOUNT_PASSWORD;
if (!url || !password) throw new Error("DATABASE_MIGRATION_URL dan TEST_ACCOUNT_PASSWORD wajib diisi lokal.");
await seedTestDatabase(url, password);
console.log("Seed sintetis selesai. Password tidak ditampilkan.");
