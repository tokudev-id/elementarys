import "server-only";
import type { Pool, PoolClient } from "pg";
import type { Actor } from "../auth/guards";
import { pool, transaction } from "../db/pool";
import { parseInput } from "../../contracts/attendance";
import {
  academicYearListSchema,
  classListSchema,
  studentListSchema,
  teacherListSchema,
  type PageResult,
  type StudentListItem,
  type TeacherListItem,
  type ClassListItem,
} from "../../contracts/lists";
import { schoolToday } from "../../domain/calendar";
import { DomainError } from "../../domain/errors";
import type { SchoolAccount } from "../../contracts/teachers";
import type { AcademicYearView } from "../../contracts/school-master";
import { assertAdmin } from "../mutations";

async function snapshot<T>(source: Pool, work: (client: PoolClient) => Promise<T>) {
  return transaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    return work(client);
  }, source);
}
async function schoolDate(client: PoolClient) {
  const row = (
    await client.query<{ timezone: string }>("SELECT timezone FROM school_config WHERE id=1")
  ).rows[0];
  return schoolToday(row?.timezone ?? "Asia/Kuala_Lumpur");
}
async function pageQuery<T>(
  client: PoolClient,
  from: string,
  columns: string,
  values: unknown[],
  order: string,
  input: { page: number; pageSize: number },
): Promise<PageResult<T>> {
  const total = (
    await client.query<{ total: number }>(`SELECT count(*)::int total ${from}`, values)
  ).rows[0].total;
  const page = Math.min(input.page, Math.max(1, Math.ceil(total / input.pageSize)));
  const items = (
    await client.query(
      `SELECT ${columns} ${from} ORDER BY ${order} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, input.pageSize, (page - 1) * input.pageSize],
    )
  ).rows as T[];
  return { items, total, page, pageSize: input.pageSize };
}

export async function listStudents(
  filter: unknown = {},
  source: Pool = pool,
): Promise<PageResult<StudentListItem>> {
  const input = parseInput(studentListSchema, filter);
  return snapshot(source, async (client) => {
    const today = await schoolDate(client);
    const from = `FROM students s LEFT JOIN LATERAL (SELECT c.id,c.name,c.grade FROM enrollments e JOIN classes c ON c.id=e.class_id WHERE e.student_id=s.id AND e.starts_on <= $4 AND e.ends_on_exclusive > $4 ORDER BY e.starts_on DESC,e.id LIMIT 1) ac ON true
      WHERE ($1='' OR s.full_name ILIKE $1 OR s.student_code ILIKE $1 OR s.nis ILIKE $1)
      AND ($2::uuid IS NULL OR ac.id=$2) AND ($3='all' OR ($3='active' AND s.archived_at IS NULL) OR ($3='archived' AND s.archived_at IS NOT NULL))`;
    const columns = `s.id,s.student_code "studentCode",s.full_name "fullName",s.nis,s.nisn,s.version,s.archived_at::text "archivedAt",CASE WHEN ac.id IS NULL THEN NULL ELSE jsonb_build_object('id',ac.id,'name',ac.name) END "activeClass"`;
    const orders = {
      name: "s.full_name,s.student_code,s.id",
      code: "s.student_code,s.full_name,s.id",
      class: "ac.grade NULLS LAST,ac.name NULLS LAST,s.full_name,s.id",
    };
    return pageQuery<StudentListItem>(
      client,
      from,
      columns,
      [input.q ? `%${input.q}%` : "", input.classId ?? null, input.status, today],
      orders[input.sort],
      input,
    );
  });
}
export async function listTeachers(
  actor: Actor,
  filter: unknown = {},
  source: Pool = pool,
): Promise<PageResult<TeacherListItem>> {
  const input = parseInput(teacherListSchema, filter);
  if (
    actor.role !== "admin" &&
    (input.role || input.sort === "email" || input.status === "password_change")
  )
    throw new DomainError("ACCESS_DENIED", "Rincian akun hanya untuk admin.", 403);
  return snapshot(source, async (client) => {
    const from = `FROM teachers t LEFT JOIN "user" u ON u.id=t.user_id WHERE ($1='' OR t.full_name ILIKE $1 OR ($4 AND u.email ILIKE $1)) AND ($2='all' OR ($2='active' AND t.active) OR ($2='inactive' AND NOT t.active) OR ($2='unlinked' AND t.user_id IS NULL) OR ($2='password_change' AND u.must_change_password)) AND ($3::text IS NULL OR u.role=$3)`;
    const columns = `t.id,t.full_name "fullName",t.active,t.version,(t.user_id IS NOT NULL) "hasAccount",
      CASE WHEN $4 AND u.id IS NOT NULL THEN jsonb_build_object('id',u.id,'name',u.name,'email',u.email,'role',u.role,'banned',COALESCE(u.banned,false),'mustChangePassword',u.must_change_password) ELSE NULL END account,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id',c.id,'name',c.name) ORDER BY c.grade,c.name,c.id) FROM teacher_classes tc JOIN classes c ON c.id=tc.class_id JOIN academic_years y ON y.id=c.academic_year_id WHERE tc.teacher_id=t.id AND y.is_current),'[]'::jsonb) classes`;
    return pageQuery<TeacherListItem>(
      client,
      from,
      columns,
      [input.q ? `%${input.q}%` : "", input.status, input.role ?? null, actor.role === "admin"],
      input.sort === "email" ? "u.email NULLS LAST,t.full_name,t.id" : "t.full_name,t.id",
      input,
    );
  });
}
export async function listClasses(
  filter: unknown = {},
  source: Pool = pool,
): Promise<PageResult<ClassListItem>> {
  const input = parseInput(classListSchema, filter);
  return snapshot(source, async (client) => {
    const today = await schoolDate(client);
    const from = `FROM classes c JOIN academic_years y ON y.id=c.academic_year_id WHERE ($1::uuid IS NULL OR c.academic_year_id=$1) AND ($2::int IS NULL OR c.grade=$2) AND ($3='all' OR ($3='active' AND c.archived_at IS NULL) OR ($3='archived' AND c.archived_at IS NOT NULL)) AND ($4='' OR c.name ILIKE $4)`;
    const columns = `c.id,c.name,c.grade,c.academic_year_id "yearId",y.label "yearLabel",c.version,c.archived_at::text "archivedAt",EXISTS(SELECT 1 FROM enrollments e WHERE e.class_id=c.id) "hasEnrollment",
      (SELECT count(*)::int FROM enrollments e JOIN students s ON s.id=e.student_id WHERE e.class_id=c.id AND e.starts_on <= $5 AND e.ends_on_exclusive > $5 AND s.archived_at IS NULL) "studentCount",
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id',t.id,'name',t.full_name) ORDER BY t.full_name,t.id) FROM teacher_classes tc JOIN teachers t ON t.id=tc.teacher_id WHERE tc.class_id=c.id AND t.active),'[]'::jsonb) "primaryTeachers"`;
    const totalFrom = from;
    const total = (
      await client.query<{ total: number }>(`SELECT count(*)::int total ${totalFrom}`, [
        input.yearId ?? null,
        input.grade ?? null,
        input.status,
        input.q ? `%${input.q}%` : "",
      ])
    ).rows[0].total;
    const page = Math.min(input.page, Math.max(1, Math.ceil(total / input.pageSize)));
    const orders = {
      name: "c.name,c.grade,c.id",
      grade: "c.grade,c.name,c.id",
      year: "y.starts_on DESC,c.grade,c.name,c.id",
    };
    const items = (
      await client.query<ClassListItem>(
        `SELECT ${columns} ${from} ORDER BY ${orders[input.sort]} LIMIT $6 OFFSET $7`,
        [
          input.yearId ?? null,
          input.grade ?? null,
          input.status,
          input.q ? `%${input.q}%` : "",
          today,
          input.pageSize,
          (page - 1) * input.pageSize,
        ],
      )
    ).rows;
    return { items, total, page, pageSize: input.pageSize };
  });
}

export async function listUnlinkedAccounts(
  actor: Actor,
  filter: unknown = {},
  source: Pool = pool,
): Promise<PageResult<SchoolAccount>> {
  assertAdmin(actor);
  const input = parseInput(teacherListSchema, filter);
  return snapshot(source, (client) =>
    pageQuery<SchoolAccount>(
      client,
      `FROM "user" u WHERE NOT EXISTS(SELECT 1 FROM teachers t WHERE t.user_id=u.id) AND ($1='' OR u.name ILIKE $1 OR u.email ILIKE $1) AND ($2::text IS NULL OR u.role=$2)`,
      `u.id,u.name,u.email,u.role,COALESCE(u.banned,false) banned,u.must_change_password "mustChangePassword"`,
      [input.q ? `%${input.q}%` : "", input.role ?? null],
      "u.name,u.id",
      input,
    ),
  );
}

export async function listAcademicYearsPage(
  filter: unknown = {},
  source: Pool = pool,
): Promise<PageResult<AcademicYearView>> {
  const input = parseInput(academicYearListSchema, filter);
  return snapshot(source, async (client) => {
    const from = `FROM academic_years WHERE ($1='' OR label ILIKE $1) AND ($2='all' OR ($2='active' AND archived_at IS NULL) OR ($2='archived' AND archived_at IS NOT NULL))`;
    const columns =
      'id,label,starts_on::text "startsOn",ends_on_exclusive::text "endsOnExclusive",is_current "isCurrent",version,archived_at::text "archivedAt"';
    const orders = {
      startsOn: "is_current DESC,starts_on DESC,id",
      label: "label,id",
    };
    return pageQuery<AcademicYearView>(
      client,
      from,
      columns,
      [input.q ? `%${input.q}%` : "", input.status],
      orders[input.sort],
      input,
    );
  });
}
