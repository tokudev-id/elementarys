import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";

export async function migrateDatabase(url: string) {
  const source = new Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(source), {
      migrationsFolder: fileURLToPath(new URL("./migrations", import.meta.url)),
    });
  } finally {
    await source.end();
  }
}
