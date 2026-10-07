import { assertLocalTestDatabase } from "../../src/server/db/safety";
import { createTestDatabase } from "../integration/harness";
import { seedTestDatabase } from "../../src/server/db/seed";
export default async function setup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL database uji wajib tersedia.");
  const name = assertLocalTestDatabase(url);
  const db = await createTestDatabase(name.slice("elementary_test_".length));
  try {
    await seedTestDatabase(db.url, "SyntheticTest123!", "test");
  } finally {
    await db.pool.end();
  }
}
