import "server-only";
import type { Pool, PoolClient } from "pg";
import { DomainError } from "@/domain/errors";
import { pool } from "../db/pool";
import { getAuth } from "./runtime";
import type { createAuth } from "./factory";
import { recordRequestActor } from "@/server/technical-log";

export type Actor = {
  id: string;
  name: string;
  role: "admin" | "teacher";
  teacherId: string | null;
  mustChangePassword: boolean;
};
export async function requireActor(
  headers: Headers,
  options: { admin?: boolean; allowPasswordChange?: boolean } = {},
  source: Pool | PoolClient = pool,
  auth: ReturnType<typeof createAuth> = getAuth(),
): Promise<Actor> {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new DomainError("SESSION_EXPIRED", "Silakan masuk kembali.", 401);
  const result = await source.query(
    'SELECT u.id,u.name,u.role,u.banned,u.must_change_password,t.id teacher_id,t.active FROM "user" u LEFT JOIN teachers t ON t.user_id=u.id WHERE u.id=$1',
    [session.user.id],
  );
  const u = result.rows[0];
  if (u) recordRequestActor(u.id);
  if (
    !u ||
    u.banned ||
    !["admin", "teacher"].includes(u.role) ||
    (u.teacher_id && !u.active) ||
    (u.role === "teacher" && !u.teacher_id)
  ) {
    throw new DomainError(
      "ACCESS_DENIED",
      "Akun tidak memiliki akses sekolah. Hubungi admin.",
      403,
    );
  }
  if (u.must_change_password && !options.allowPasswordChange)
    throw new DomainError(
      "PASSWORD_CHANGE_REQUIRED",
      "Ganti password sementara sebelum membuka data sekolah.",
      403,
    );
  if (options.admin && u.role !== "admin")
    throw new DomainError("ACCESS_DENIED", "Tindakan ini memerlukan akun admin.", 403);
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    teacherId: u.teacher_id,
    mustChangePassword: u.must_change_password,
  };
}

export function requireOrigin(request: Request, baseURL = process.env.BETTER_AUTH_URL) {
  const effectiveBaseURL =
    baseURL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  const requestOrigin = request.headers.get("origin");
  const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const baseOrigin = effectiveBaseURL ? new URL(effectiveBaseURL).origin : null;

  const isAllowed =
    (baseOrigin && requestOrigin === baseOrigin) ||
    (requestOrigin && trustedOrigins.includes(requestOrigin));

  if (!isAllowed) {
    throw new DomainError("ACCESS_DENIED", "Asal permintaan tidak diizinkan.", 403);
  }
}
