import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";
import { printSnapshotSchema, type PrintSnapshot } from "@/contracts/print-report";
import type { MonthlyReport } from "@/contracts/reports";
import type { Actor } from "@/server/auth/guards";
import { parseInput } from "@/contracts/attendance";
import { DomainError } from "@/domain/errors";
import { pool, transaction } from "@/server/db/pool";

function signature(snapshot: Omit<PrintSnapshot, "token">, actorId: string, secret: string) {
  const versions = Object.fromEntries(
    Object.entries(snapshot.sessionVersions).sort(([left], [right]) => left.localeCompare(right)),
  );
  return createHmac("sha256", secret)
    .update(
      JSON.stringify({
        actorId,
        input: snapshot.input,
        generatedAt: snapshot.generatedAt,
        versions,
      }),
    )
    .digest("base64url");
}
function printSecret() {
  const value = process.env.BETTER_AUTH_SECRET;
  if (!value) throw new Error("Konfigurasi penandatanganan cetak belum tersedia.");
  return value;
}
export function printSnapshot(
  report: MonthlyReport,
  actor: Actor,
  secret = printSecret(),
): PrintSnapshot {
  const snapshot = {
    input: report.input,
    sessionVersions: report.sessionVersions,
    generatedAt: report.generatedAt,
  };
  return { ...snapshot, token: signature(snapshot, actor.id, secret) };
}
export async function recordPrintExport(
  body: unknown,
  actor: Actor,
  source: Pool = pool,
  secret = printSecret(),
) {
  const snapshot = parseInput(printSnapshotSchema, body);
  const expected = signature(snapshot, actor.id, secret);
  if (!timingSafeEqual(Buffer.from(snapshot.token), Buffer.from(expected)))
    throw new DomainError(
      "INVALID_INPUT",
      "Halaman cetak tidak sesuai. Muat ulang halaman sebelum mencetak.",
    );
  return transaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    const { input, sessionVersions } = snapshot;
    const ids = Object.keys(sessionVersions);
    const scoped = (
      await client.query<{ id: string }>(
        `SELECT a.id FROM attendance_sessions a JOIN classes c ON c.id=a.class_id
      WHERE a.id=ANY($1::uuid[]) AND c.academic_year_id=$2 AND date_trunc('month',a.date)::date=$3 AND ($4::uuid IS NULL OR a.class_id=$4)`,
        [ids, input.yearId, `${input.month}-01`, input.classId ?? null],
      )
    ).rows;
    if (scoped.length !== ids.length)
      throw new DomainError(
        "INVALID_INPUT",
        "Catatan pada halaman cetak berada di luar kelas atau bulan yang dipilih.",
      );
    const result = await client.query<{ id: string }>(
      "INSERT INTO report_exports(academic_year_id,month,class_id,format,session_versions,exported_by) VALUES($1,$2,$3,'print',$4,$5) RETURNING id",
      [
        input.yearId,
        `${input.month}-01`,
        input.classId ?? null,
        JSON.stringify(sessionVersions),
        actor.id,
      ],
    );
    return { exportId: result.rows[0].id };
  }, source);
}
