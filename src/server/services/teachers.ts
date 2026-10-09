import "server-only";
export { listTeachers } from "../queries/master-lists";
import { z } from "zod";
import type { Pool, PoolClient } from "pg";
import {
  teacherInputSchema,
  teacherPatchSchema,
  teacherAccountSchema,
  teacherClassesSchema,
  accessInputSchema,
  resetPasswordSchema,
  type TeacherView,
  type SchoolAccount,
} from "@/contracts/teachers";
import { parseInput } from "@/contracts/attendance";
import { DomainError } from "@/domain/errors";
import type { Actor } from "@/server/auth/guards";
import { createAuth } from "@/server/auth/factory";
import { createManagedAccount } from "@/server/auth/accounts";
import { audit, pool, transaction, lockRows } from "@/server/db/pool";
import { assertAdmin, assertVersion, mutationTransaction } from "@/server/mutations";

type TeacherRow = {
  id: string;
  fullName: string;
  active: boolean;
  version: number;
  userId: string | null;
};
export type TeacherOptions = { source?: Pool; authConfig?: { secret: string; baseURL: string } };
async function authorizeAdminMutation(client: PoolClient, actor: Actor) {
  assertAdmin(actor);
  await client.query('SELECT id FROM "user" ORDER BY id FOR NO KEY UPDATE');
  const row = (
    await client.query<{
      role: string;
      banned: boolean;
      mustChangePassword: boolean;
      active: boolean | null;
    }>(
      'SELECT u.role,u.banned,u.must_change_password "mustChangePassword",t.active FROM "user" u LEFT JOIN teachers t ON t.user_id=u.id WHERE u.id=$1',
      [actor.id],
    )
  ).rows[0];
  if (!row || row.role !== "admin" || row.banned || row.mustChangePassword || row.active === false)
    throw new DomainError("ACCESS_DENIED", "Akun tidak lagi memiliki akses admin.", 403);
}
async function teacherRow(client: PoolClient, id: string) {
  parseInput(z.uuid(), id);
  const row = (
    await client.query<TeacherRow>(
      'SELECT id,full_name "fullName",active,version,user_id "userId" FROM teachers WHERE id=$1 FOR UPDATE',
      [id],
    )
  ).rows[0];
  if (!row) throw new DomainError("RESOURCE_NOT_FOUND", "Profil guru tidak ditemukan.", 404);
  return row;
}
async function accountRow(client: PoolClient, id: string): Promise<SchoolAccount> {
  const row = (
    await client.query<SchoolAccount>(
      'SELECT id,name,email,role,COALESCE(banned,false) banned,must_change_password "mustChangePassword" FROM "user" WHERE id=$1',
      [id],
    )
  ).rows[0];
  if (!row) throw new DomainError("RESOURCE_NOT_FOUND", "Akun tidak ditemukan.", 404);
  return row;
}
async function protectLastAdmin(
  client: PoolClient,
  user: SchoolAccount | null,
  beforeActive: boolean,
  role: string,
  banned: boolean,
  afterActive: boolean,
) {
  if (
    !user ||
    user.role !== "admin" ||
    user.banned ||
    user.mustChangePassword ||
    !beforeActive ||
    (role === "admin" && !banned && afterActive)
  )
    return;
  const count = (
    await client.query<{ count: number }>(
      "SELECT count(*)::int count FROM \"user\" u LEFT JOIN teachers t ON t.user_id=u.id WHERE u.role='admin' AND NOT COALESCE(u.banned,false) AND NOT u.must_change_password AND (t.id IS NULL OR t.active)",
    )
  ).rows[0].count;
  if (count <= 1)
    throw new DomainError(
      "LAST_ACTIVE_ADMIN",
      "Admin aktif terakhir tidak dapat dinonaktifkan, diarsipkan, atau diturunkan. Siapkan admin aktif lain terlebih dahulu.",
      409,
    );
}
function transactionAuth(client: PoolClient, options: TeacherOptions) {
  const secret = options.authConfig?.secret ?? process.env.BETTER_AUTH_SECRET;
  const baseURL =
    options.authConfig?.baseURL ??
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  if (!secret || !baseURL) throw new Error("Konfigurasi auth belum lengkap.");
  return createAuth(client, secret, baseURL);
}
export async function listTeacherOptions(
  actor: Actor,
  source: Pool = pool,
): Promise<TeacherView[]> {
  return transaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const rows = (
      await client.query<TeacherRow>(
        'SELECT id,full_name "fullName",active,version,user_id "userId" FROM teachers ORDER BY full_name,id',
      )
    ).rows;
    const classes = (
      await client.query<{ teacherId: string; id: string; name: string }>(
        'SELECT tc.teacher_id "teacherId",c.id,c.name FROM teacher_classes tc JOIN classes c ON c.id=tc.class_id ORDER BY c.grade,c.name,c.id',
      )
    ).rows;
    const users =
      actor.role === "admin"
        ? (
            await client.query<SchoolAccount>(
              'SELECT id,name,email,role,COALESCE(banned,false) banned,must_change_password "mustChangePassword" FROM "user"',
            )
          ).rows
        : [];
    return rows.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      active: row.active,
      version: row.version,
      hasAccount: Boolean(row.userId),
      account: users.find((user) => user.id === row.userId) ?? null,
      classes: classes
        .filter((item) => item.teacherId === row.id)
        .map((item) => ({ id: item.id, name: item.name })),
    }));
  }, source);
}
export async function getTeacher(id: string, actor: Actor, source: Pool = pool) {
  parseInput(z.uuid(), id);
  const teacher = (await listTeacherOptions(actor, source)).find((item) => item.id === id);
  if (!teacher) throw new DomainError("RESOURCE_NOT_FOUND", "Guru tidak ditemukan.", 404);
  return teacher;
}
export async function unlinkedAccounts(
  actor: Actor,
  source: Pool = pool,
): Promise<SchoolAccount[]> {
  assertAdmin(actor);
  return (
    await source.query<SchoolAccount>(
      'SELECT u.id,u.name,u.email,u.role,COALESCE(u.banned,false) banned,u.must_change_password "mustChangePassword" FROM "user" u WHERE NOT EXISTS(SELECT 1 FROM teachers t WHERE t.user_id=u.id) ORDER BY u.name,u.id',
    )
  ).rows;
}
export async function createTeacher(
  body: unknown,
  actor: Actor,
  requestId: string,
  source: Pool = pool,
) {
  assertAdmin(actor);
  const input = parseInput(teacherInputSchema, body);
  return mutationTransaction(async (client) => {
    await authorizeAdminMutation(client, actor);
    const row = (
      await client.query<{ id: string }>(
        "INSERT INTO teachers(full_name,active) VALUES($1,$2) RETURNING id",
        [input.fullName, input.active],
      )
    ).rows[0];
    await audit(client, actor.id, "teacher.create", "teacher", row.id, requestId, {
      actorName: actor.name,
      before: null,
      after: input,
    });
    return { saved: true as const, id: row.id, version: 1 };
  }, source);
}
export async function updateTeacher(
  id: string,
  body: unknown,
  actor: Actor,
  requestId: string,
  source: Pool = pool,
) {
  assertAdmin(actor);
  const input = parseInput(teacherPatchSchema, body);
  return mutationTransaction(async (client) => {
    await authorizeAdminMutation(client, actor);
    const before = await teacherRow(client, id);
    assertVersion(before.version, input.expectedVersion);
    const user = before.userId ? await accountRow(client, before.userId) : null;
    await protectLastAdmin(
      client,
      user,
      before.active,
      user?.role ?? "teacher",
      user?.banned ?? false,
      input.active,
    );
    await client.query("UPDATE teachers SET full_name=$2,active=$3,version=version+1 WHERE id=$1", [
      id,
      input.fullName,
      input.active,
    ]);
    if (before.userId) {
      await client.query('UPDATE "user" SET name=$2,updated_at=now() WHERE id=$1', [
        before.userId,
        input.fullName,
      ]);
      if (!input.active) {
        await client.query(
          "UPDATE \"user\" SET banned=true,ban_reason='Profil guru diarsipkan' WHERE id=$1",
          [before.userId],
        );
        await client.query('DELETE FROM "session" WHERE user_id=$1', [before.userId]);
      }
    }
    await audit(client, actor.id, "teacher.update", "teacher", id, requestId, {
      actorName: actor.name,
      before: { ...before, account: user },
      after: {
        fullName: input.fullName,
        active: input.active,
        version: before.version + 1,
        account: before.userId ? await accountRow(client, before.userId) : null,
      },
    });
    return { saved: true as const, id, version: before.version + 1 };
  }, source);
}
export async function linkTeacherAccount(
  id: string,
  body: unknown,
  actor: Actor,
  requestId: string,
  options: TeacherOptions = {},
) {
  assertAdmin(actor);
  const input = parseInput(teacherAccountSchema, body);
  return mutationTransaction(async (client) => {
    await authorizeAdminMutation(client, actor);
    const teacher = await teacherRow(client, id);
    assertVersion(teacher.version, input.expectedVersion);
    if (!teacher.active)
      throw new DomainError("INVALID_INPUT", "Aktifkan profil guru sebelum menautkan akun.");
    if (teacher.userId) throw new DomainError("INVALID_INPUT", "Profil guru sudah mempunyai akun.");
    let userId: string;
    let role: string;
    if (input.mode === "create") {
      const account = await createManagedAccount(transactionAuth(client, options), {
        email: input.email,
        name: teacher.fullName,
        password: input.password,
        role: "teacher",
        mustChangePassword: true,
      });
      userId = account.user.id;
      role = input.role;
    } else {
      const user = await accountRow(client, input.userId);
      userId = user.id;
      role = user.role === "admin" ? "admin" : "teacher";
      if ((await client.query("SELECT id FROM teachers WHERE user_id=$1", [userId])).rowCount)
        throw new DomainError("INVALID_INPUT", "Akun sudah terhubung ke profil guru lain.");
    }
    await client.query("UPDATE teachers SET user_id=$2,version=version+1 WHERE id=$1", [
      id,
      userId,
    ]);
    await client.query('UPDATE "user" SET role=$2,updated_at=now() WHERE id=$1', [userId, role]);
    await audit(client, actor.id, "teacher.account-link", "teacher", id, requestId, {
      actorName: actor.name,
      before: { userId: null },
      after: { userId, role, version: teacher.version + 1 },
    });
    return { saved: true as const, id, version: teacher.version + 1 };
  }, options.source ?? pool);
}
export async function assignTeacherClasses(
  id: string,
  body: unknown,
  actor: Actor,
  requestId: string,
  source: Pool = pool,
) {
  assertAdmin(actor);
  const input = parseInput(teacherClassesSchema, body);
  return mutationTransaction(async (client) => {
    const found = (
      await client.query<{ yearId: string }>(
        'SELECT academic_year_id "yearId" FROM classes WHERE id=ANY($1::uuid[])',
        [input.classIds],
      )
    ).rows;
    await lockRows(
      client,
      "academic_years",
      found.map((item) => item.yearId),
      "SHARE",
    );
    await authorizeAdminMutation(client, actor);
    const teacher = await teacherRow(client, id);
    assertVersion(teacher.version, input.expectedVersion);
    const eligible = (
      await client.query(
        "SELECT c.id FROM classes c JOIN academic_years y ON y.id=c.academic_year_id WHERE c.id=ANY($1::uuid[]) AND c.archived_at IS NULL AND y.archived_at IS NULL AND y.is_current",
        [input.classIds],
      )
    ).rows;
    if (eligible.length !== input.classIds.length)
      throw new DomainError(
        "INVALID_INPUT",
        "Pilih kelas pada tahun ajaran aktif yang belum diarsipkan.",
      );
    const before = (
      await client.query<{ classId: string }>(
        'SELECT class_id "classId" FROM teacher_classes WHERE teacher_id=$1',
        [id],
      )
    ).rows.map((item) => item.classId);
    await client.query("DELETE FROM teacher_classes WHERE teacher_id=$1", [id]);
    await client.query(
      "INSERT INTO teacher_classes(teacher_id,class_id) SELECT $1,unnest($2::uuid[])",
      [id, input.classIds],
    );
    await client.query("UPDATE teachers SET version=version+1 WHERE id=$1", [id]);
    await audit(client, actor.id, "teacher.classes", "teacher", id, requestId, {
      actorName: actor.name,
      before,
      after: input.classIds,
    });
    return { saved: true as const, id, version: teacher.version + 1 };
  }, source);
}
export async function updateAccountAccess(
  userId: string,
  body: unknown,
  actor: Actor,
  requestId: string,
  source: Pool = pool,
) {
  assertAdmin(actor);
  const input = parseInput(accessInputSchema, body);
  return mutationTransaction(async (client) => {
    await authorizeAdminMutation(client, actor);
    const user = await accountRow(client, userId);
    const profile = (
      await client.query<TeacherRow>(
        'SELECT id,full_name "fullName",active,version,user_id "userId" FROM teachers WHERE user_id=$1 FOR UPDATE',
        [userId],
      )
    ).rows[0];
    assertVersion(profile?.version ?? null, input.expectedVersion);
    if (user.role !== input.expectedRole || user.banned !== input.expectedBanned)
      throw new DomainError(
        "VERSION_CONFLICT",
        "Akses akun telah berubah. Muat data terbaru.",
        409,
      );
    if (profile && !profile.active && !input.banned)
      throw new DomainError("INVALID_INPUT", "Aktifkan profil guru sebelum membuka akses akun.");
    await protectLastAdmin(
      client,
      user,
      profile?.active ?? true,
      input.role,
      input.banned,
      profile?.active ?? true,
    );
    await client.query('UPDATE "user" SET role=$2,banned=$3,updated_at=now() WHERE id=$1', [
      userId,
      input.role,
      input.banned,
    ]);
    await client.query('DELETE FROM "session" WHERE user_id=$1', [userId]);
    if (profile)
      await client.query("UPDATE teachers SET version=version+1 WHERE id=$1", [profile.id]);
    await audit(client, actor.id, "user.access", "user", userId, requestId, {
      actorName: actor.name,
      before: { role: user.role, banned: user.banned },
      after: { role: input.role, banned: input.banned },
    });
    return { saved: true as const, id: userId, version: profile ? profile.version + 1 : undefined };
  }, source);
}
export async function resetAccountPassword(
  userId: string,
  body: unknown,
  actor: Actor,
  headers: Headers,
  requestId: string,
  options: TeacherOptions = {},
) {
  assertAdmin(actor);
  const input = parseInput(resetPasswordSchema, body);
  return mutationTransaction(async (client) => {
    await authorizeAdminMutation(client, actor);
    const before = await accountRow(client, userId);
    const profile = (
      await client.query<{ id: string; version: number }>(
        "SELECT id,version FROM teachers WHERE user_id=$1 FOR UPDATE",
        [userId],
      )
    ).rows[0];
    assertVersion(profile?.version ?? null, input.expectedVersion);
    await transactionAuth(client, options).api.setUserPassword({
      headers,
      body: { userId, newPassword: input.newPassword },
    });
    await client.query('UPDATE "user" SET must_change_password=true,updated_at=now() WHERE id=$1', [
      userId,
    ]);
    const revoked = await client.query('DELETE FROM "session" WHERE user_id=$1', [userId]);
    if (profile)
      await client.query("UPDATE teachers SET version=version+1 WHERE id=$1", [profile.id]);
    await audit(client, actor.id, "user.password-reset", "user", userId, requestId, {
      actorName: actor.name,
      before: { mustChangePassword: before.mustChangePassword },
      after: { mustChangePassword: true, revokedSessions: revoked.rowCount },
    });
    return { saved: true as const, id: userId, version: profile ? profile.version + 1 : undefined };
  }, options.source ?? pool);
}
