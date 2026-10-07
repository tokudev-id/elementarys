import "server-only";
import type { Pool, PoolClient } from "pg";
import {
  reportInputSchema,
  type MonthlyReport,
  type ReportInput,
  type ClassReport,
} from "@/contracts/reports";
import { parseInput } from "@/contracts/attendance";
import { DomainError } from "@/domain/errors";
import { monthDates, reportCell, summarizeCells } from "@/domain/report";
import {
  resolveSchoolDay,
  schoolToday,
  isTimezone,
  systemClock,
  type Clock,
} from "@/domain/calendar";
import { statuses, type AttendanceStatus, type AttendanceTotals } from "@/domain/attendance";
import { pool, transaction } from "@/server/db/pool";
import { schoolContext } from "@/server/services/attendance/context";

type EnrollmentRow = {
  classId: string;
  studentId: string;
  studentCode: string;
  fullName: string;
  startsOn: string;
  endsOnExclusive: string;
};
type SessionRow = { id: string; classId: string; date: string; version: number };
type RecordRow = { classId: string; studentId: string; date: string; status: AttendanceStatus };
type ExportRow = {
  classId: string | null;
  versions: Record<string, number>;
  exportedAt: Date;
  exportedBy: string;
};
export type ReportYear = {
  id: string;
  label: string;
  startsOn: string;
  endsOnExclusive: string;
  isCurrent: boolean;
};
export type ReportClass = { id: string; name: string; grade: number; yearId: string };

export async function reportFilters(source: Pool = pool) {
  const years = (
    await source.query<ReportYear>(
      'SELECT id,label,starts_on::text "startsOn",ends_on_exclusive::text "endsOnExclusive",is_current "isCurrent" FROM academic_years ORDER BY is_current DESC,starts_on DESC',
    )
  ).rows;
  const classes = (
    await source.query<ReportClass>(
      'SELECT id,name,grade,academic_year_id "yearId" FROM classes ORDER BY grade,name,id',
    )
  ).rows;
  const config = (
    await source.query<{ timezone: string }>("SELECT timezone FROM school_config WHERE id=1")
  ).rows[0];
  return {
    years,
    classes,
    today: schoolToday(config && isTimezone(config.timezone) ? config.timezone : "UTC"),
  };
}

export async function projectMonthlyReport(
  client: PoolClient,
  input: ReportInput,
  clock: Clock = systemClock,
): Promise<MonthlyReport> {
  const filter = parseInput(reportInputSchema, input);
  const context = await schoolContext(client, clock);
  const year = (
    await client.query<ReportYear>(
      'SELECT id,label,starts_on::text "startsOn",ends_on_exclusive::text "endsOnExclusive",is_current "isCurrent" FROM academic_years WHERE id=$1',
      [filter.yearId],
    )
  ).rows[0];
  if (!year) throw new DomainError("RESOURCE_NOT_FOUND", "Tahun ajaran tidak ditemukan.", 404);
  const dates = monthDates(filter.month);
  const first = dates[0];
  const last = dates.at(-1)!;
  if (last < year.startsOn || first >= year.endsOnExclusive)
    throw new DomainError("OUTSIDE_ACADEMIC_YEAR", "Bulan di luar tahun ajaran.", 422);
  const classes = (
    await client.query<ReportClass>(
      'SELECT id,name,grade,academic_year_id "yearId" FROM classes WHERE academic_year_id=$1 AND ($2::uuid IS NULL OR id=$2) ORDER BY grade,name,id',
      [filter.yearId, filter.classId ?? null],
    )
  ).rows;
  if (filter.classId && !classes.length)
    throw new DomainError(
      "RESOURCE_NOT_FOUND",
      "Kelas tidak ditemukan dalam tahun ajaran ini.",
      404,
    );
  const ids = classes.map((item) => item.id);
  const weekdays = (
    await client.query<{ weekday: number }>(
      "SELECT weekday FROM school_weekdays WHERE academic_year_id=$1",
      [filter.yearId],
    )
  ).rows.map((row) => row.weekday);
  if (!weekdays.length)
    throw new DomainError("SETUP_INCOMPLETE", "Lengkapi hari belajar sebelum membuka rekap.", 422);
  const overrides = (
    await client.query<{ date: string; isSchoolDay: boolean; reason: string }>(
      'SELECT date::text,is_school_day "isSchoolDay",reason FROM school_day_overrides WHERE academic_year_id=$1 AND date BETWEEN $2 AND $3',
      [filter.yearId, first, last],
    )
  ).rows;
  const calendar = {
    startsOn: year.startsOn,
    endsOnExclusive: year.endsOnExclusive,
    weekdays,
    overrides,
  };
  const days = new Map(dates.map((date) => [date, resolveSchoolDay(date, calendar)]));
  const enrollments = (
    await client.query<EnrollmentRow>(
      `SELECT e.class_id "classId",s.id "studentId",s.student_code "studentCode",s.full_name "fullName",e.starts_on::text "startsOn",e.ends_on_exclusive::text "endsOnExclusive"
    FROM enrollments e JOIN students s ON s.id=e.student_id WHERE e.class_id=ANY($1::uuid[]) AND e.starts_on <= $3 AND e.ends_on_exclusive > $2 ORDER BY s.full_name,s.student_code,e.starts_on`,
      [ids, first, last],
    )
  ).rows;
  const sessions = (
    await client.query<SessionRow>(
      'SELECT id,class_id "classId",date::text,version FROM attendance_sessions WHERE class_id=ANY($1::uuid[]) AND date BETWEEN $2 AND $3',
      [ids, first, last],
    )
  ).rows;
  const records = (
    await client.query<RecordRow>(
      `SELECT a.class_id "classId",r.student_id "studentId",r.date::text,r.status FROM attendance_records r JOIN attendance_sessions a ON a.id=r.session_id
    WHERE a.class_id=ANY($1::uuid[]) AND a.date BETWEEN $2 AND $3 AND a.state='submitted'`,
      [ids, first, last],
    )
  ).rows;
  const exports = (
    await client.query<ExportRow>(
      `SELECT e.class_id "classId",e.session_versions versions,e.exported_at "exportedAt",u.name "exportedBy" FROM report_exports e JOIN "user" u ON u.id=e.exported_by
    WHERE e.academic_year_id=$1 AND e.month=$2 AND (e.class_id=ANY($3::uuid[]) OR e.class_id IS NULL) ORDER BY e.exported_at DESC,e.id DESC`,
      [filter.yearId, first, ids],
    )
  ).rows;
  const recordMap = new Map(
    records.map((row) => [`${row.classId}:${row.studentId}:${row.date}`, row.status]),
  );
  const enrollmentMap = new Map<string, Map<string, EnrollmentRow[]>>();
  for (const row of enrollments) {
    const students = enrollmentMap.get(row.classId) ?? new Map<string, EnrollmentRow[]>();
    const intervals = students.get(row.studentId) ?? [];
    intervals.push(row);
    students.set(row.studentId, intervals);
    enrollmentMap.set(row.classId, students);
  }
  const reports: ClassReport[] = classes.map((item) => {
    const students = Array.from(enrollmentMap.get(item.id)?.values() ?? []).map((intervals) => {
      const student = intervals[0];
      const cells = dates.map((date) => {
        const day = days.get(date)!;
        const enrolled =
          day.inYear &&
          intervals.some(
            (interval) => interval.startsOn <= date && interval.endsOnExclusive > date,
          );
        return reportCell(
          date,
          enrolled,
          day.isSchoolDay,
          context.schoolToday,
          recordMap.get(`${item.id}:${student.studentId}:${date}`),
        );
      });
      return {
        studentId: student.studentId,
        studentCode: student.studentCode,
        fullName: student.fullName,
        cells,
        ...summarizeCells(cells),
      };
    });
    const totals: AttendanceTotals = { H: 0, S: 0, I: 0, A: 0 };
    let missingDays = 0;
    for (const student of students) {
      for (const status of statuses) totals[status] += student.totals[status];
      missingDays += student.missingDays;
    }
    const reference = exports.find((row) => row.classId === null || row.classId === item.id);
    const changedDates = reference
      ? sessions
          .filter((row) => row.classId === item.id && reference.versions[row.id] !== row.version)
          .map((row) => row.date)
          .sort()
      : [];
    return {
      classId: item.id,
      name: item.name,
      grade: item.grade,
      students,
      totals,
      missingDays,
      complete: missingDays === 0,
      exportReference: reference
        ? {
            exportedAt: reference.exportedAt.toISOString(),
            exportedBy: reference.exportedBy,
            changedDates,
          }
        : null,
    };
  });
  return {
    input: filter,
    ...context,
    academicYearLabel: year.label,
    generatedAt: clock().toISOString(),
    dates,
    classes: reports,
    sessionVersions: Object.fromEntries(sessions.map((row) => [row.id, row.version])),
    complete: reports.every((item) => item.complete),
  };
}

export function buildMonthlyAttendanceReport(
  input: ReportInput,
  source: Pool = pool,
  clock: Clock = systemClock,
) {
  return transaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    return projectMonthlyReport(client, input, clock);
  }, source);
}
