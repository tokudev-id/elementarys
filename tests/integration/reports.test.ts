import { beforeAll, beforeEach, afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { createTestDatabase, resetDatabase } from "./harness";
import {
  buildMonthlyAttendanceReport,
  projectMonthlyReport,
} from "../../src/server/reports/monthly";
import { transaction } from "../../src/server/db/pool";
import ExcelJS from "exceljs";
import { createReportWorkbook, exportAttendanceWorkbook } from "../../src/server/reports/workbook";
import { printSnapshot, recordPrintExport } from "../../src/server/reports/print";

let source: Pool;
let yearId: string;
let classes: string[];
let studentId: string;
const clock = () => new Date("2024-02-20T04:00:00Z");
beforeAll(async () => {
  source = (await createTestDatabase("reports")).pool;
}, 30000);
afterAll(async () => {
  await source?.end();
});
beforeEach(async () => {
  await resetDatabase(source);
  await source.query(
    "INSERT INTO \"user\"(id,name,email,role) VALUES('reporter','Guru Laporan','reporter@example.test','teacher')",
  );
  await source.query("INSERT INTO school_config(name,configured_at) VALUES('Sekolah Uji',now())");
  yearId = (
    await source.query(
      "INSERT INTO academic_years(label,starts_on,ends_on_exclusive,is_current) VALUES('2024','2024-01-01','2025-01-01',true) RETURNING id",
    )
  ).rows[0].id;
  await source.query("INSERT INTO school_weekdays SELECT $1,generate_series(0,6)", [yearId]);
  classes = [];
  for (let index = 1; index <= 2; index++)
    classes.push(
      (
        await source.query(
          "INSERT INTO classes(academic_year_id,grade,name) VALUES($1,$2,$3) RETURNING id",
          [yearId, index, `Kelas ${index}`],
        )
      ).rows[0].id,
    );
  studentId = (
    await source.query(
      "INSERT INTO students(student_code,full_name) VALUES('S-1','Nama Sama') RETURNING id",
    )
  ).rows[0].id;
});
async function enroll(classId: string, startsOn: string, endsOn: string, student = studentId) {
  return (
    await source.query(
      "INSERT INTO enrollments(student_id,class_id,starts_on,ends_on_exclusive) VALUES($1,$2,$3,$4) RETURNING id",
      [student, classId, startsOn, endsOn],
    )
  ).rows[0].id as string;
}
async function record(
  classId: string,
  enrollment: string,
  date: string,
  status = "H",
  student = studentId,
) {
  const id = (
    await source.query(
      "INSERT INTO attendance_sessions(class_id,date,state,submitted_by,submitted_at) VALUES($1,$2,'submitted','reporter',now()) RETURNING id",
      [classId, date],
    )
  ).rows[0].id as string;
  await source.query(
    "INSERT INTO attendance_records(session_id,enrollment_id,student_id,date,status) VALUES($1,$2,$3,$4,$5)",
    [id, enrollment, student, date, status],
  );
  return id;
}
const read = () => buildMonthlyAttendanceReport({ yearId, month: "2024-02" }, source, clock);

it("projects leap February, transfer, exit, holiday, missing, future and void without double counting", async () => {
  const first = await enroll(classes[0], "2024-02-03", "2024-02-15");
  const second = await enroll(classes[1], "2024-02-15", "2024-02-19");
  await source.query("INSERT INTO school_day_overrides VALUES($1,'2024-02-04',false,'Libur uji')", [
    yearId,
  ]);
  const submitted = await record(classes[0], first, "2024-02-03");
  const voided = await record(classes[1], second, "2024-02-15", "S");
  await source.query("DELETE FROM attendance_records WHERE session_id=$1", [voided]);
  await source.query(
    "UPDATE attendance_sessions SET state='voided',version=version+1,void_reason='Batal uji' WHERE id=$1",
    [voided],
  );
  const report = await read();
  expect(report.dates).toHaveLength(29);
  expect(report.classes[0].students[0].cells.slice(0, 5)).toEqual(["-", "-", "H", "L", "?"]);
  expect(report.classes[0].students[0].cells[14]).toBe("-");
  expect(report.classes[1].students[0].cells.slice(13, 20)).toEqual([
    "-",
    "?",
    "?",
    "?",
    "?",
    "-",
    "-",
  ]);
  expect(report.classes.map((item) => item.totals.H)).toEqual([1, 0]);
  expect(report.classes.every((item) => item.exportReference === null)).toBe(true);
  expect(report.sessionVersions).toEqual({ [submitted]: 1, [voided]: 2 });
  const newcomer = (
    await source.query(
      "INSERT INTO students(student_code,full_name) VALUES('S-2','Siswa Baru') RETURNING id",
    )
  ).rows[0].id;
  await enroll(classes[0], "2024-02-21", "2024-03-01", newcomer);
  const future = (await read()).classes[0].students.find((item) => item.studentId === newcomer)!;
  expect(future.cells[20]).toBe(".");
  expect(future.expectedDaysToDate).toBe(0);
});

it("compares latest class/all-class exports by session versions and resets the reference after a new export", async () => {
  const enrollment = await enroll(classes[0], "2024-02-01", "2024-03-01");
  const id = await record(classes[0], enrollment, "2024-02-01");
  await source.query(
    "INSERT INTO report_exports(academic_year_id,month,format,session_versions,exported_by) VALUES($1,'2024-02-01','xlsx',$2,'reporter')",
    [yearId, JSON.stringify({ [id]: 1 })],
  );
  expect((await read()).classes[0].exportReference?.changedDates).toEqual([]);
  await source.query("UPDATE attendance_records SET status='A' WHERE session_id=$1", [id]);
  await source.query("UPDATE attendance_sessions SET version=2 WHERE id=$1", [id]);
  const newlyFilled = await record(classes[0], enrollment, "2024-02-02", "I");
  const changed = await read();
  expect(changed.classes[0].exportReference?.changedDates).toEqual(["2024-02-01", "2024-02-02"]);
  expect(changed.classes[1].exportReference?.changedDates).toEqual([]);
  await source.query(
    "INSERT INTO report_exports(academic_year_id,month,class_id,format,session_versions,exported_by,exported_at) VALUES($1,'2024-02-01',$2,'print',$3,'reporter',now()+interval '1 second')",
    [yearId, classes[0], JSON.stringify({ [id]: 2, [newlyFilled]: 1 })],
  );
  expect((await read()).classes[0].exportReference?.changedDates).toEqual([]);
});

it("uses the school timezone at midnight and rejects invalid filters while retaining historical years", async () => {
  await enroll(classes[0], "2024-02-01", "2024-03-01");
  const midnight = () => new Date("2024-02-20T17:00:00Z");
  expect(
    (await buildMonthlyAttendanceReport({ yearId, month: "2024-02" }, source, midnight)).classes[0]
      .students[0].cells[20],
  ).toBe("?");
  await source.query("UPDATE school_config SET timezone='America/New_York'");
  expect(
    (await buildMonthlyAttendanceReport({ yearId, month: "2024-02" }, source, midnight)).classes[0]
      .students[0].cells[20],
  ).toBe(".");
  await source.query("UPDATE academic_years SET is_current=false,archived_at=now()");
  expect((await read()).dates).toHaveLength(29);
  await expect(
    buildMonthlyAttendanceReport({ yearId, month: "2025-01" }, source, clock),
  ).rejects.toMatchObject({ code: "OUTSIDE_ACADEMIC_YEAR" });
  await expect(
    buildMonthlyAttendanceReport(
      { yearId, month: "2024-02", classId: randomUUID() },
      source,
      clock,
    ),
  ).rejects.toMatchObject({ code: "RESOURCE_NOT_FOUND" });
});

it("keeps query count independent of roster size", async () => {
  await enroll(classes[0], "2024-02-01", "2024-03-01");
  async function countQueries() {
    return transaction(async (client) => {
      await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      let count = 0;
      const counted = {
        query: (...args: Parameters<PoolClient["query"]>) => {
          count++;
          return client.query(...args);
        },
      } as PoolClient;
      await projectMonthlyReport(counted, { yearId, month: "2024-02" }, clock);
      return count;
    }, source);
  }
  const small = await countQueries();
  await source.query(
    "INSERT INTO students(student_code,full_name) SELECT 'N-'||i,'Siswa Tambahan '||i FROM generate_series(1,60) i",
  );
  await source.query(
    "INSERT INTO enrollments(student_id,class_id,starts_on,ends_on_exclusive) SELECT id,$1,'2024-02-01','2024-03-01' FROM students WHERE student_code LIKE 'N-%'",
    [classes[0]],
  );
  expect(await countQueries()).toBe(small);
  expect(small).toBeLessThan(15);
});

it("uses one repeatable-read snapshot while a correction commits between report queries", async () => {
  const enrollment = await enroll(classes[0], "2024-02-01", "2024-03-01");
  const id = await record(classes[0], enrollment, "2024-02-01");
  const report = await transaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    let corrected = false;
    const intercepted = new Proxy(client, {
      get(target, property) {
        if (property !== "query") return Reflect.get(target, property);
        return async (sql: string, parameters: unknown[]) => {
          const result = await target.query(sql, parameters);
          if (!corrected && sql.includes("FROM enrollments")) {
            corrected = true;
            await source.query("UPDATE attendance_records SET status='A' WHERE session_id=$1", [
              id,
            ]);
            await source.query("UPDATE attendance_sessions SET version=2 WHERE id=$1", [id]);
          }
          return result;
        };
      },
    });
    return projectMonthlyReport(intercepted, { yearId, month: "2024-02" }, clock);
  }, source);
  expect(report.classes[0].students[0].cells[0]).toBe("H");
  expect(report.sessionVersions[id]).toBe(1);
  const updated = await read();
  expect(updated.classes[0].students[0].cells[0]).toBe("A");
  expect(updated.sessionVersions[id]).toBe(2);
});

it("writes six class sheets and summary, numeric totals and literal formula-looking strings with valid unique sheet names", async () => {
  await source.query("UPDATE classes SET name=$2 WHERE id=$1", [
    classes[0],
    "Nama/kelas/yang/panjang/untuk/uji/collision-satu",
  ]);
  await source.query("UPDATE classes SET name=$2 WHERE id=$1", [
    classes[1],
    "Nama/kelas/yang/panjang/untuk/uji/collision-dua",
  ]);
  for (let index = 3; index <= 6; index++)
    await source.query("INSERT INTO classes(academic_year_id,grade,name) VALUES($1,$2,$3)", [
      yearId,
      index,
      `Kelas ${index}`,
    ]);
  await source.query("UPDATE students SET full_name='=1+1',student_code='00123' WHERE id=$1", [
    studentId,
  ]);
  const enrollment = await enroll(classes[0], "2024-02-01", "2024-03-01");
  await record(classes[0], enrollment, "2024-02-01");
  const report = await read();
  const encoded = await createReportWorkbook(report, { name: "Guru Laporan" }).xlsx.writeBuffer();
  const decoded = new ExcelJS.Workbook();
  await decoded.xlsx.load(encoded);
  expect(decoded.worksheets).toHaveLength(7);
  expect(new Set(decoded.worksheets.map((item) => item.name.toLowerCase())).size).toBe(7);
  for (const sheet of decoded.worksheets) {
    expect(sheet.name.length).toBeLessThanOrEqual(31);
    expect(sheet.name).not.toMatch(/[\\/*?:\[\]]/);
  }
  const sheet = decoded.worksheets[1];
  expect(sheet.getCell("A10").value).toBe("00123");
  expect(sheet.getCell("B10").value).toBe("=1+1");
  expect(sheet.getRow(10).getCell(32).value).toBe(1);
  expect(decoded.worksheets[0].getCell("C4").value).toBe(report.classes[0].totals.H);
  expect(sheet.getCell("A5").value).toBe("Belum lengkap");
});

it("records workbook export from the same projection and leaves its versions unchanged after later corrections", async () => {
  const enrollment = await enroll(classes[0], "2024-02-01", "2024-03-01");
  const id = await record(classes[0], enrollment, "2024-02-01");
  const exported = await exportAttendanceWorkbook(
    { yearId, month: "2024-02" },
    {
      id: "reporter",
      name: "Guru Laporan",
      role: "teacher",
      teacherId: null,
      mustChangePassword: false,
    },
    source,
  );
  const entry = (await source.query("SELECT session_versions FROM report_exports")).rows[0];
  expect(entry.session_versions).toEqual(exported.report.sessionVersions);
  const decoded = new ExcelJS.Workbook();
  await decoded.xlsx.load(exported.content.buffer);
  expect(decoded.worksheets[1].getCell("C10").value).toBe("H");
  await source.query("UPDATE attendance_sessions SET version=2 WHERE id=$1", [id]);
  expect((await read()).classes[0].exportReference?.changedDates).toEqual(["2024-02-01"]);
});

it("opening a print snapshot does not write; pressing print records the rendered versions even after a correction", async () => {
  const enrollment = await enroll(classes[0], "2024-02-01", "2024-03-01");
  const id = await record(classes[0], enrollment, "2024-02-01");
  const actor = {
    id: "reporter",
    name: "Guru Laporan",
    role: "teacher" as const,
    teacherId: null,
    mustChangePassword: false,
  };
  const secret = randomUUID();
  const snapshot = printSnapshot(await read(), actor, secret);
  expect((await source.query("SELECT count(*)::int n FROM report_exports")).rows[0].n).toBe(0);
  await source.query("UPDATE attendance_sessions SET version=2 WHERE id=$1", [id]);
  const result = await recordPrintExport(snapshot, actor, source, secret);
  expect(result.exportId).toBeDefined();
  expect(
    (await source.query("SELECT session_versions FROM report_exports")).rows[0].session_versions,
  ).toEqual({ [id]: 1 });
  expect((await read()).classes[0].exportReference?.changedDates).toEqual(["2024-02-01"]);
  await expect(
    recordPrintExport({ ...snapshot, sessionVersions: { [id]: 2 } }, actor, source, secret),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  await expect(
    recordPrintExport(snapshot, { ...actor, id: "other" }, source, secret),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  const outside = printSnapshot(
    { ...(await read()), input: { yearId, month: "2024-02", classId: classes[1] } },
    actor,
    secret,
  );
  await expect(recordPrintExport(outside, actor, source, secret)).rejects.toMatchObject({
    code: "INVALID_INPUT",
  });
});
