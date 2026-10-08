import "server-only";
import { z } from "zod";
import type { Pool, PoolClient } from "pg";
import type { Actor } from "@/server/auth/guards";
import type { StudentView } from "@/contracts/students";
import {
  enrollmentInputSchema,
  enrollmentEndSchema,
  studentArchiveSchema,
  promotionInputSchema,
  type PlacementInput,
  type PromotionPreview,
  type PromotionResult,
} from "@/contracts/enrollments";
import { parseInput } from "@/contracts/attendance";
import { DomainError } from "@/domain/errors";
import { systemClock, type Clock } from "@/domain/calendar";
import { pool, transaction, lockRows, audit } from "@/server/db/pool";
import { assertAdmin, assertVersion, mutationTransaction } from "@/server/mutations";
import { schoolContext } from "@/server/services/attendance/context";

export type EnrollmentOptions = {
  source?: Pool;
  clock?: Clock;
  afterValidation?: (client: PoolClient) => Promise<void>;
};
type ClassPlacement = {
  id: string;
  name: string;
  yearId: string;
  yearLabel: string;
  startsOn: string;
  endsOnExclusive: string;
  archived: boolean;
};
type EnrollmentRow = {
  id: string;
  studentId: string;
  classId: string;
  startsOn: string;
  endsOnExclusive: string;
  className: string;
  yearLabel: string;
  exitReason: string | null;
};
const enrollmentColumns =
  'e.id,e.student_id "studentId",e.class_id "classId",e.starts_on::text "startsOn",e.ends_on_exclusive::text "endsOnExclusive",c.name "className",y.label "yearLabel",e.exit_reason "exitReason"';

async function readClasses(client: PoolClient, ids: string[]) {
  return (
    await client.query<ClassPlacement>(
      'SELECT c.id,c.name,c.academic_year_id "yearId",y.label "yearLabel",y.starts_on::text "startsOn",y.ends_on_exclusive::text "endsOnExclusive",(c.archived_at IS NOT NULL OR y.archived_at IS NOT NULL) archived FROM classes c JOIN academic_years y ON y.id=c.academic_year_id WHERE c.id=ANY($1::uuid[])',
      [ids],
    )
  ).rows;
}
async function lockPlacementRows(client: PoolClient, students: string[], classes: string[]) {
  const ids = [...new Set(classes)];
  const initial = await readClasses(client, ids);
  if (initial.length !== ids.length)
    throw new DomainError("RESOURCE_NOT_FOUND", "Kelas tidak ditemukan.", 404);
  await lockRows(
    client,
    "academic_years",
    initial.map((item) => item.yearId),
    "SHARE",
  );
  await lockRows(client, "students", students, "NO KEY UPDATE");
  await lockRows(client, "classes", ids);
  const latest = await readClasses(client, ids);
  if (latest.some((item) => initial.find((old) => old.id === item.id)?.yearId !== item.yearId))
    throw new DomainError("VERSION_CONFLICT", "Tahun kelas berubah. Muat data terbaru.", 409);
  return new Map(latest.map((item) => [item.id, item]));
}
async function studentRow(client: PoolClient, id: string) {
  const row = (
    await client.query<StudentView>(
      'SELECT id,student_code "studentCode",full_name "fullName",nis,nisn,version,archived_at::text "archivedAt" FROM students WHERE id=$1',
      [id],
    )
  ).rows[0];
  if (!row) throw new DomainError("RESOURCE_NOT_FOUND", "Siswa tidak ditemukan.", 404);
  return row;
}
async function enrollmentRow(client: PoolClient, id: string): Promise<EnrollmentRow> {
  const row = (
    await client.query<EnrollmentRow>(
      `SELECT ${enrollmentColumns} FROM enrollments e JOIN classes c ON c.id=e.class_id JOIN academic_years y ON y.id=c.academic_year_id WHERE e.id=$1`,
      [id],
    )
  ).rows[0];
  if (!row)
    throw new DomainError(
      "RESOURCE_NOT_FOUND",
      "Penempatan tidak ditemukan. Muat data terbaru.",
      404,
    );
  return row;
}
async function assertHistoricalRoster(
  client: PoolClient,
  ranges: { classId: string; startsOn: string; endsOnExclusive: string }[],
) {
  const row = (
    await client.query<{ safeDate: string | null }>(
      `SELECT (max(a.date)+1)::text "safeDate" FROM attendance_sessions a WHERE a.state='submitted' AND EXISTS(SELECT 1 FROM jsonb_to_recordset($1::jsonb) r("classId" uuid,"startsOn" date,"endsOnExclusive" date) WHERE a.class_id=r."classId" AND a.date>=r."startsOn" AND a.date<r."endsOnExclusive")`,
      [JSON.stringify(ranges)],
    )
  ).rows[0];
  if (row.safeDate)
    throw new DomainError(
      "HISTORICAL_ROSTER_CHANGE",
      `Perubahan mengubah daftar pada absensi tersimpan. Tanggal aman berikutnya: ${row.safeDate}.`,
      409,
      {
        startsOn: [`Tanggal aman berikutnya: ${row.safeDate}`],
        endsOnExclusive: [`Tanggal aman berikutnya: ${row.safeDate}`],
      },
    );
}
async function validatePlacement(
  client: PoolClient,
  student: StudentView,
  target: ClassPlacement,
  input: PlacementInput,
) {
  assertVersion(student.version, input.expectedVersion);
  if (student.archivedAt)
    throw new DomainError("INVALID_INPUT", "Aktifkan kembali siswa sebelum menambah penempatan.");
  if (target.archived)
    throw new DomainError("INVALID_INPUT", "Kelas atau tahun tujuan telah diarsipkan.");
  if (input.startsOn < target.startsOn || input.startsOn >= target.endsOnExclusive)
    throw new DomainError(
      "OUTSIDE_ACADEMIC_YEAR",
      "Tanggal mulai di luar tahun ajaran tujuan.",
      422,
    );
  let before: EnrollmentRow | null = null;
  if (input.mode === "transfer") {
    before = await enrollmentRow(client, input.fromEnrollmentId);
    if (before.studentId !== student.id || before.classId === target.id)
      throw new DomainError(
        "INVALID_INPUT",
        "Pilih penempatan siswa dan kelas tujuan yang berbeda.",
      );
    const source = (await readClasses(client, [before.classId]))[0];
    if (
      source.yearId !== target.yearId ||
      input.startsOn <= before.startsOn ||
      input.startsOn >= before.endsOnExclusive
    )
      throw new DomainError(
        "INVALID_INPUT",
        "Transfer harus berada di dalam penempatan dan tahun yang sama. Gunakan penempatan baru untuk tahun berikutnya.",
      );
  }
  const overlap = (
    await client.query<{ exists: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM enrollments WHERE student_id=$1 AND id IS DISTINCT FROM $4::uuid AND starts_on<$3 AND ends_on_exclusive>$2) exists",
      [student.id, input.startsOn, target.endsOnExclusive, before?.id ?? null],
    )
  ).rows[0].exists;
  if (overlap)
    throw new DomainError(
      "INVALID_INPUT",
      "Rentang penempatan bertumpang tindih dengan riwayat siswa.",
    );
  await assertHistoricalRoster(client, [
    { classId: target.id, startsOn: input.startsOn, endsOnExclusive: target.endsOnExclusive },
    ...(before
      ? [
          {
            classId: before.classId,
            startsOn: input.startsOn,
            endsOnExclusive: before.endsOnExclusive,
          },
        ]
      : []),
  ]);
  return before;
}
async function writePlacement(
  client: PoolClient,
  student: StudentView,
  target: ClassPlacement,
  input: PlacementInput,
  before: EnrollmentRow | null,
  actor: Actor,
  requestId: string,
) {
  if (before)
    await client.query("UPDATE enrollments SET ends_on_exclusive=$2,exit_reason=$3 WHERE id=$1", [
      before.id,
      input.startsOn,
      input.reason,
    ]);
  const row = (
    await client.query<{ id: string }>(
      "INSERT INTO enrollments(student_id,class_id,starts_on,ends_on_exclusive) VALUES($1,$2,$3,$4) RETURNING id",
      [student.id, target.id, input.startsOn, target.endsOnExclusive],
    )
  ).rows[0];
  await client.query("UPDATE students SET version=version+1 WHERE id=$1", [student.id]);
  await audit(
    client,
    actor.id,
    before ? "enrollment.transfer" : "enrollment.create",
    "student",
    student.id,
    requestId,
    {
      actorName: actor.name,
      before,
      after: {
        id: row.id,
        studentId: student.id,
        classId: target.id,
        className: target.name,
        yearLabel: target.yearLabel,
        startsOn: input.startsOn,
        endsOnExclusive: target.endsOnExclusive,
        previousEndsOnExclusive: before ? input.startsOn : null,
        previousExitReason: before ? input.reason : null,
        exitReason: null,
        studentVersion: student.version + 1,
      },
    },
    input.reason,
  );
  return { saved: true as const, id: row.id, version: student.version + 1 };
}
export async function placeStudent(
  id: string,
  body: unknown,
  actor: Actor,
  requestId: string,
  options: EnrollmentOptions = {},
) {
  assertAdmin(actor);
  parseInput(z.uuid(), id);
  const input = parseInput(enrollmentInputSchema, body);
  return mutationTransaction(async (client) => {
    const initial =
      input.mode === "transfer" ? await enrollmentRow(client, input.fromEnrollmentId) : null;
    const classes = await lockPlacementRows(
      client,
      [id],
      [input.classId, ...(initial ? [initial.classId] : [])],
    );
    const student = await studentRow(client, id);
    const target = classes.get(input.classId)!;
    const before = await validatePlacement(client, student, target, input);
    await options.afterValidation?.(client);
    return writePlacement(client, student, target, input, before, actor, requestId);
  }, options.source ?? pool);
}
export async function endEnrollment(
  id: string,
  body: unknown,
  actor: Actor,
  requestId: string,
  options: EnrollmentOptions = {},
) {
  assertAdmin(actor);
  parseInput(z.uuid(), id);
  const input = parseInput(enrollmentEndSchema, body);
  return mutationTransaction(async (client) => {
    const initial = await enrollmentRow(client, id);
    await lockPlacementRows(client, [initial.studentId], [initial.classId]);
    const student = await studentRow(client, initial.studentId);
    assertVersion(student.version, input.expectedVersion);
    const before = await enrollmentRow(client, id);
    const context = await schoolContext(client, options.clock ?? systemClock);
    const cancel =
      input.endsOnExclusive === before.startsOn && before.startsOn > context.schoolToday;
    if (
      !cancel &&
      (input.endsOnExclusive <= before.startsOn || input.endsOnExclusive > before.endsOnExclusive)
    )
      throw new DomainError(
        "INVALID_INPUT",
        "Tanggal keluar harus setelah mulai dan tidak melewati akhir penempatan.",
      );
    if (input.endsOnExclusive === before.endsOnExclusive)
      return { saved: true as const, id, version: student.version };
    await assertHistoricalRoster(client, [
      {
        classId: before.classId,
        startsOn: input.endsOnExclusive,
        endsOnExclusive: before.endsOnExclusive,
      },
    ]);
    if (cancel) await client.query("DELETE FROM enrollments WHERE id=$1", [id]);
    else
      await client.query("UPDATE enrollments SET ends_on_exclusive=$2,exit_reason=$3 WHERE id=$1", [
        id,
        input.endsOnExclusive,
        input.reason,
      ]);
    await client.query("UPDATE students SET version=version+1 WHERE id=$1", [student.id]);
    await audit(
      client,
      actor.id,
      cancel ? "enrollment.cancel" : "enrollment.end",
      "student",
      student.id,
      requestId,
      {
        actorName: actor.name,
        before,
        after: cancel
          ? null
          : { ...before, endsOnExclusive: input.endsOnExclusive, exitReason: input.reason },
        studentVersion: student.version + 1,
      },
      input.reason,
    );
    return { saved: true as const, id, version: student.version + 1 };
  }, options.source ?? pool);
}
export async function archiveStudent(
  id: string,
  body: unknown,
  actor: Actor,
  requestId: string,
  options: EnrollmentOptions = {},
) {
  assertAdmin(actor);
  parseInput(z.uuid(), id);
  const input = parseInput(studentArchiveSchema, body);
  return mutationTransaction(async (client) => {
    const enrolled = (
      await client.query<{ classId: string }>(
        'SELECT class_id "classId" FROM enrollments WHERE student_id=$1',
        [id],
      )
    ).rows;
    await lockPlacementRows(
      client,
      [id],
      enrolled.map((item) => item.classId),
    );
    const before = await studentRow(client, id);
    assertVersion(before.version, input.expectedVersion);
    const context = await schoolContext(client, options.clock ?? systemClock);
    if (
      input.archived &&
      (
        await client.query<{ exists: boolean }>(
          "SELECT EXISTS(SELECT 1 FROM enrollments WHERE student_id=$1 AND ends_on_exclusive>$2) exists",
          [id, context.schoolToday],
        )
      ).rows[0].exists
    )
      throw new DomainError(
        "INVALID_INPUT",
        "Tutup penempatan yang berjalan dan batalkan penempatan mendatang sebelum mengarsipkan siswa.",
      );
    const archivedAt = input.archived ? (options.clock ?? systemClock)().toISOString() : null;
    await client.query("UPDATE students SET archived_at=$2,version=version+1 WHERE id=$1", [
      id,
      archivedAt,
    ]);
    await audit(
      client,
      actor.id,
      "student.archive",
      "student",
      id,
      requestId,
      {
        actorName: actor.name,
        before,
        after: { ...before, archivedAt, version: before.version + 1 },
      },
      input.reason,
    );
    return { saved: true as const, id, version: before.version + 1 };
  }, options.source ?? pool);
}
export async function previewPromotion(
  body: unknown,
  actor: Actor,
  source: Pool = pool,
): Promise<PromotionPreview> {
  assertAdmin(actor);
  const input = parseInput(promotionInputSchema, body);
  return transaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const items: PromotionPreview["items"] = [];
    for (const entry of input.entries) {
      const student = await studentRow(client, entry.studentId);
      let message = "Siap ditempatkan; penempatan lama tetap tersimpan.";
      let ready = true;
      try {
        const target = (await readClasses(client, [entry.classId]))[0];
        if (!target)
          throw new DomainError("RESOURCE_NOT_FOUND", "Kelas tujuan tidak ditemukan.", 404);
        await validatePlacement(client, student, target, { ...entry, mode: "placement" });
      } catch (error) {
        if (!(error instanceof DomainError)) throw error;
        ready = false;
        message = error.message;
      }
      items.push({
        studentId: student.id,
        name: student.fullName,
        code: student.studentCode,
        ready,
        message,
      });
    }
    return { items };
  }, source);
}
export async function promoteStudents(
  body: unknown,
  actor: Actor,
  requestId: string,
  source: Pool = pool,
): Promise<PromotionResult> {
  assertAdmin(actor);
  const input = parseInput(promotionInputSchema, body);
  return mutationTransaction(async (client) => {
    const classes = await lockPlacementRows(
      client,
      input.entries.map((entry) => entry.studentId),
      input.entries.map((entry) => entry.classId),
    );
    const prepared: { student: StudentView; target: ClassPlacement; input: PlacementInput }[] = [];
    for (const entry of input.entries) {
      const student = await studentRow(client, entry.studentId);
      const target = classes.get(entry.classId)!;
      const placement = { ...entry, mode: "placement" as const };
      await validatePlacement(client, student, target, placement);
      prepared.push({ student, target, input: placement });
    }
    const results: PromotionResult["results"] = [];
    for (const item of prepared) {
      const saved = await writePlacement(
        client,
        item.student,
        item.target,
        item.input,
        null,
        actor,
        requestId,
      );
      results.push({ studentId: item.student.id, version: saved.version });
    }
    return { saved: true, id: requestId, results };
  }, source);
}
export async function promotionCandidates(classId: string, source: Pool = pool) {
  parseInput(z.uuid(), classId);
  return (
    await source.query<StudentView>(
      'SELECT s.id,s.student_code "studentCode",s.full_name "fullName",s.nis,s.nisn,s.version,s.archived_at::text "archivedAt" FROM students s JOIN enrollments e ON e.student_id=s.id JOIN classes c ON c.id=e.class_id JOIN academic_years y ON y.id=c.academic_year_id WHERE e.class_id=$1 AND s.archived_at IS NULL AND e.starts_on<y.ends_on_exclusive AND e.ends_on_exclusive=y.ends_on_exclusive ORDER BY s.full_name,s.student_code',
      [classId],
    )
  ).rows;
}
