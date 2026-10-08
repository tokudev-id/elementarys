import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import { assertReleaseTarget } from "../../src/domain/release-target";
export async function releaseTarget(operation: "migrate" | "bootstrap") {
  config({ path: process.env.RELEASE_ENV_FILE ?? ".local/release.env", quiet: true });
  const path = process.env.RELEASE_MANIFEST_FILE;
  const url = process.env.DATABASE_MIGRATION_URL;
  if (!path || !url) throw new Error("Manifest dan koneksi rilis wajib tersedia.");
  const data = await readFile(path, "utf8");
  if (data.length > 16384) throw new Error("Manifest terlalu besar.");
  const target = assertReleaseTarget(
    url,
    JSON.parse(data),
    operation,
    process.env.RELEASE_CONFIRM,
    process.env.APP_ENV,
  );
  return { url, target };
}
