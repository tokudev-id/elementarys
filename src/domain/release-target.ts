import { z } from "zod";
export const releaseTargetSchema = z
  .object({
    projectId: z.literal("rough-dawn-85427948"),
    branchName: z.enum(["development", "production"]),
    branchId: z
      .string()
      .regex(/^br-[a-z0-9-]+$/)
      .max(100),
    endpointHost: z
      .string()
      .regex(/^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/)
      .max(240),
    databaseName: z
      .string()
      .regex(/^[a-zA-Z0-9_-]+$/)
      .max(63),
    migrationRole: z
      .string()
      .regex(/^[a-zA-Z0-9_-]+$/)
      .max(63),
    postgresMajor: z.literal(18),
  })
  .strict();
export function assertReleaseTarget(
  url: string,
  manifest: unknown,
  operation: "migrate" | "bootstrap",
  confirmation: string | undefined,
  environment: string | undefined,
) {
  const parsed = releaseTargetSchema.safeParse(manifest);
  if (!parsed.success) throw new Error("Metadata target rilis belum valid.");
  const target = parsed.data;
  if (
    environment !== target.branchName ||
    confirmation !== `${operation}:${target.projectId}:${target.branchId}`
  )
    throw new Error("Konfirmasi operasi dan environment harus cocok dengan metadata target.");
  let connection: URL;
  try {
    connection = new URL(url);
  } catch {
    throw new Error("Koneksi target belum valid.");
  }
  if (
    !["postgresql:", "postgres:"].includes(connection.protocol) ||
    connection.hostname !== target.endpointHost ||
    connection.hostname.includes("-pooler.") ||
    (connection.port && connection.port !== "5432") ||
    decodeURIComponent(connection.pathname.slice(1)) !== target.databaseName ||
    decodeURIComponent(connection.username) !== target.migrationRole ||
    !["require", "verify-full"].includes(connection.searchParams.get("sslmode") ?? "") ||
    target.databaseName.startsWith("elementary_test_")
  )
    throw new Error(
      "Koneksi direct/TLS, database, dan role harus cocok dengan metadata target rilis.",
    );
  return target;
}
