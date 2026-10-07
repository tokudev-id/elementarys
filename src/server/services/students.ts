import "server-only";
import { z } from "zod";
import type { Pool } from "pg";
import {
  studentInputSchema,
  studentPatchSchema,
  type StudentView,
  type StudentDetail,
} from "@/contracts/students";
import { parseInput } from "@/contracts/attendance";
import { DomainError } from "@/domain/errors";
import type { Actor } from "@/server/auth/guards";
import { assertAdmin, assertVersion, mutationTransaction } from "@/server/mutations";
import { audit, pool, transaction, lockRows } from "@/server/db/pool";

const studentColumns =
  'id,student_code "studentCode",full_name "fullName",nis,nisn,version,archived_at::text "archivedAt"';
export async function listStudents(
  filter: { classId?: string; search?: string } = {},
  source: Pool = pool,
): Promise<StudentView[]> {
  const input = parseInput(
    z
      .object({ classId: z.uuid().optional(), search: z.string().trim().max(200).optional() })
      .strict(),
    filter,
  );
  return (
    await source.query<StudentView>(
      `SELECT ${studentColumns} FROM students s WHERE s.archived_at IS NULL AND ($1::uuid IS NULL OR EXISTS(SELECT 1 FROM enrollments e WHERE e.student_id=s.id AND e.class_id=$1)) AND (full_name ILIKE $2 OR student_code ILIKE $2) ORDER BY full_name,student_code,id`,
      [input.classId ?? null, `%${input.search ?? ""}%`],
    )
  ).rows;
}
export async function getStudent(id: string, source: Pool = pool): Promise<StudentDetail> {
  parseInput(z.uuid(), id);
  return transaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const student = (
      await client.query<StudentView>(`SELECT ${studentColumns} FROM students WHERE id=$1`, [id])
    ).rows[0];
    if (!student) throw new DomainError("RESOURCE_NOT_FOUND", "Siswa tidak ditemukan.", 404);
    const enrollments = (
      await client.query<StudentDetail["enrollments"][number]>(
        'SELECT e.id,e.class_id "classId",c.name "className",y.label "yearLabel",e.starts_on::text "startsOn",e.ends_on_exclusive::text "endsOnExclusive" FROM enrollments e JOIN classes c ON c.id=e.class_id JOIN academic_years y ON y.id=c.academic_year_id WHERE e.student_id=$1 ORDER BY e.starts_on,e.id',
        [id],
      )
    ).rows;
    return { ...student, enrollments };
  }, source);
}
export async function createStudent(
  body: unknown,
  actor: Actor,
  requestId: string,
  source: Pool = pool,
) {
  assertAdmin(actor);
  const input = parseInput(studentInputSchema, body);
  return mutationTransaction(async (client) => {
    const initial = (
      await client.query<{ yearId: string }>(
        'SELECT academic_year_id "yearId" FROM classes WHERE id=$1',
        [input.classId],
      )
    ).rows[0];
    if (!initial) throw new DomainError("RESOURCE_NOT_FOUND", "Kelas tidak ditemukan.", 404);
    await lockRows(client, "academic_years", [initial.yearId], "SHARE");
    const row = (
      await client.query<{ id: string; studentCode: string }>(
        `WITH code AS (SELECT nextval('student_code_seq')::text value) INSERT INTO students(student_code,full_name,nis,nisn) SELECT 'S-'||lpad(value,greatest(4,length(value)),'0'),$1,$2,$3 FROM code RETURNING id,student_code "studentCode"`,
        [input.fullName, input.nis, input.nisn],
      )
    ).rows[0];
    await lockRows(client, "classes", [input.classId]);
    const target = (
      await client.query<{
        yearId: string;
        startsOn: string;
        endsOnExclusive: string;
        archived: boolean;
      }>(
        'SELECT c.academic_year_id "yearId",y.starts_on::text "startsOn",y.ends_on_exclusive::text "endsOnExclusive",(c.archived_at IS NOT NULL OR y.archived_at IS NOT NULL) archived FROM classes c JOIN academic_years y ON y.id=c.academic_year_id WHERE c.id=$1',
        [input.classId],
      )
    ).rows[0];
    if (target.yearId !== initial.yearId)
      throw new DomainError("VERSION_CONFLICT", "Kelas berubah. Muat data terbaru.", 409);
    if (target.archived)
      throw new DomainError("INVALID_INPUT", "Kelas atau tahun ajaran telah diarsipkan.");
    if (input.startsOn < target.startsOn || input.startsOn >= target.endsOnExclusive)
      throw new DomainError(
        "OUTSIDE_ACADEMIC_YEAR",
        "Tanggal mulai di luar tahun ajaran kelas.",
        422,
      );
    const historical = (
      await client.query<{ safeDate: string | null }>(
        "SELECT (max(date)+1)::text \"safeDate\" FROM attendance_sessions WHERE class_id=$1 AND state='submitted' AND date >= $2 AND date < $3",
        [input.classId, input.startsOn, target.endsOnExclusive],
      )
    ).rows[0].safeDate;
    if (historical)
      throw new DomainError(
        "HISTORICAL_ROSTER_CHANGE",
        `Tanggal mulai mengubah catatan yang sudah tersimpan. Pilih ${historical} atau tahun ajaran lain.`,
        409,
        { startsOn: [`Tanggal aman berikutnya: ${historical}`] },
      );
    const enrollment = (
      await client.query<{ id: string }>(
        "INSERT INTO enrollments(student_id,class_id,starts_on,ends_on_exclusive) VALUES($1,$2,$3,$4) RETURNING id",
        [row.id, input.classId, input.startsOn, target.endsOnExclusive],
      )
    ).rows[0];
    await audit(client, actor.id, "student.create", "student", row.id, requestId, {
      actorName: actor.name,
      before: null,
      after: {
        studentCode: row.studentCode,
        fullName: input.fullName,
        nis: input.nis,
        nisn: input.nisn,
        enrollmentId: enrollment.id,
        classId: input.classId,
        startsOn: input.startsOn,
        endsOnExclusive: target.endsOnExclusive,
      },
    });
    return { saved: true as const, id: row.id, version: 1 };
  }, source);
}
export async function updateStudent(
  id: string,
  body: unknown,
  actor: Actor,
  requestId: string,
  source: Pool = pool,
) {
  assertAdmin(actor);
  parseInput(z.uuid(), id);
  const input = parseInput(studentPatchSchema, body);
  return mutationTransaction(async (client) => {
    const before = (
      await client.query<StudentView>(
        `SELECT ${studentColumns} FROM students WHERE id=$1 FOR UPDATE`,
        [id],
      )
    ).rows[0];
    if (!before) throw new DomainError("RESOURCE_NOT_FOUND", "Siswa tidak ditemukan.", 404);
    assertVersion(before.version, input.expectedVersion);
    await client.query(
      "UPDATE students SET full_name=$2,student_code=$3,nis=$4,nisn=$5,version=version+1 WHERE id=$1",
      [id, input.fullName, input.studentCode, input.nis, input.nisn],
    );
    await audit(client, actor.id, "student.update", "student", id, requestId, {
      actorName: actor.name,
      before,
      after: { ...input, version: before.version + 1 },
    });
    return { saved: true as const, id, version: before.version + 1 };
  }, source);
}
