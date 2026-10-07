import "server-only";
import ExcelJS from "exceljs";
import type { Pool } from "pg";
import type { MonthlyReport, ReportInput } from "@/contracts/reports";
import type { Actor } from "@/server/auth/guards";
import { pool, transaction } from "@/server/db/pool";
import { projectMonthlyReport } from "./monthly";

export function sheetName(name: string, used: Set<string>) {
  const sanitized = name.replace(/[\\/*?:\[\]]/g, " ").replace(/^[\s']+|[\s']+$/g, "") || "Kelas";
  const shortened = truncateSheetName(sanitized, 31);
  const base = shortened.toLowerCase() === "history" ? `${shortened} (kelas)` : shortened;
  let candidate = base;
  for (let index = 2; used.has(candidate.toLowerCase()); index++) {
    const suffix = ` (${index})`;
    candidate = `${truncateSheetName(base, 31 - suffix.length)}${suffix}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function truncateSheetName(value: string, limit: number) {
  let result = "";
  for (const character of value) {
    if (result.length + character.length > limit) break;
    result += character;
  }
  return result.replace(/[\s']+$/g, "");
}

export function createReportWorkbook(report: MonthlyReport, actor: Pick<Actor, "name">) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = actor.name;
  workbook.created = new Date(report.generatedAt);
  const used = new Set<string>();
  if (!report.input.classId) {
    const summary = workbook.addWorksheet(sheetName("Ringkasan", used));
    summary.addRow([report.schoolName]);
    summary.addRow([
      report.academicYearLabel,
      report.input.month,
      actor.name,
      report.generatedAt,
      report.complete ? "Lengkap" : "Belum lengkap",
    ]);
    summary.addRow(["Kelas", "Siswa dalam periode", "H", "S", "I", "A", "Belum dicatat"]);
    for (const item of report.classes)
      summary.addRow([
        item.name,
        item.students.length,
        item.totals.H,
        item.totals.S,
        item.totals.I,
        item.totals.A,
        item.missingDays,
      ]);
    summary.columns.forEach((column) => {
      column.width = 24;
    });
  }
  for (const item of report.classes) {
    const sheet = workbook.addWorksheet(sheetName(item.name, used), {
      pageSetup: {
        paperSize: 9,
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
    });
    sheet.addRow([report.schoolName]);
    sheet.addRow(["Rekap absensi internal"]);
    sheet.addRow([item.name, report.academicYearLabel, report.input.month]);
    sheet.addRow(["Pengekspor", actor.name, "Dibuat", report.generatedAt, report.timezone]);
    sheet.addRow([
      item.complete ? "Lengkap" : "Belum lengkap",
      "Catatan belum dicatat",
      item.missingDays,
    ]);
    sheet.addRow([
      "H Hadir; S Sakit; I Izin; A Alpa; ? Belum dicatat; L Libur; - Di luar penempatan; . Mendatang",
    ]);
    const reference = item.exportReference;
    sheet.addRow(
      reference?.changedDates.length
        ? [
            "Berubah setelah ekspor terakhir",
            reference.exportedBy,
            reference.exportedAt,
            reference.changedDates.join(", "),
          ]
        : [],
    );
    sheet.addRow([]);
    sheet.addRow([
      "Kode siswa",
      "Nama siswa",
      ...report.dates.map((date) => Number(date.slice(-2))),
      "H",
      "S",
      "I",
      "A",
      "Belum dicatat",
    ]);
    for (const student of item.students) {
      const row = sheet.addRow([
        student.studentCode,
        student.fullName,
        ...student.cells,
        student.totals.H,
        student.totals.S,
        student.totals.I,
        student.totals.A,
        student.missingDays,
      ]);
      row.getCell(1).numFmt = "@";
      row.getCell(2).numFmt = "@";
    }
    sheet.getColumn(1).width = 16;
    sheet.getColumn(2).width = 32;
    for (let index = 3; index <= report.dates.length + 7; index++) sheet.getColumn(index).width = 5;
    sheet.views = [{ state: "frozen", xSplit: 2, ySplit: 9 }];
    sheet.pageSetup.printTitlesRow = "9:9";
    sheet.getRow(9).font = { bold: true };
  }
  return workbook;
}

export async function exportAttendanceWorkbook(
  input: ReportInput,
  actor: Actor,
  source: Pool = pool,
) {
  return transaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    const report = await projectMonthlyReport(client, input);
    const buffer = await createReportWorkbook(report, actor).xlsx.writeBuffer();
    await client.query(
      "INSERT INTO report_exports(academic_year_id,month,class_id,format,session_versions,exported_by) VALUES($1,$2,$3,'xlsx',$4,$5)",
      [
        input.yearId,
        `${input.month}-01`,
        input.classId ?? null,
        JSON.stringify(report.sessionVersions),
        actor.id,
      ],
    );
    return { content: new Uint8Array(buffer), report };
  }, source);
}
