import "server-only";
import type { Pool } from "pg";
import { pool } from "@/server/db/pool";
import type { CalendarAbsenceRecord } from "@/contracts/school-master";

export async function getMonthStudentAbsences(
  academicYearId: string,
  month: string,
  source: Pool = pool,
): Promise<CalendarAbsenceRecord[]> {
  try {
    const startDate = `${month}-01`;
    const [yearNum, monthNum] = month.split("-").map(Number);
    const nextDateObj = new Date(Date.UTC(yearNum, monthNum, 1));
    const nextMonth = nextDateObj.toISOString().slice(0, 7);
    const endDate = `${nextMonth}-01`;

    const res = await source.query<{
      date: string;
      studentName: string;
      className: string;
      status: "S" | "I" | "A";
    }>(
      `SELECT
        r.date::text,
        s.full_name AS "studentName",
        c.name AS "className",
        r.status
      FROM attendance_records r
      JOIN attendance_sessions ses ON ses.id = r.session_id AND ses.state = 'submitted'
      JOIN students s ON s.id = r.student_id
      JOIN enrollments e ON e.id = r.enrollment_id
      JOIN classes c ON c.id = e.class_id
      WHERE c.academic_year_id = $1
        AND r.date >= $2
        AND r.date < $3
        AND r.status IN ('S', 'I', 'A')
      ORDER BY r.date, c.name, s.full_name`,
      [academicYearId, startDate, endDate],
    );

    return res.rows;
  } catch {
    return [];
  }
}
