import "server-only";
import type { Pool, PoolClient } from "pg";
import { settingsInputSchema, type SchoolSettings, type SetupState } from "@/contracts/settings";
import { parseInput } from "@/contracts/attendance";
import { isTimezone, systemClock, type Clock } from "@/domain/calendar";
import { DomainError } from "@/domain/errors";
import type { Actor } from "@/server/auth/guards";
import { assertAdmin, assertVersion, mutationTransaction } from "@/server/mutations";
import { audit, pool, transaction } from "@/server/db/pool";

type ConfigRow = {
  name: string;
  location: string | null;
  timezone: string;
  version: number;
  configuredAt: Date | null;
};
export async function setupState(
  client: PoolClient,
  config: Pick<ConfigRow, "name" | "location" | "timezone"> | undefined,
  production = process.env.APP_ENV === "production",
): Promise<SetupState> {
  const year = (
    await client.query<{
      id: string;
      weekdays: boolean;
      classes: boolean;
    }>(`SELECT y.id,EXISTS(SELECT 1 FROM school_weekdays w WHERE w.academic_year_id=y.id) weekdays,
    EXISTS(SELECT 1 FROM classes c WHERE c.academic_year_id=y.id AND c.archived_at IS NULL) classes FROM academic_years y WHERE y.is_current AND y.archived_at IS NULL`)
  ).rows[0];
  const synthetic = Boolean(
    config &&
    /data sintetis|sekolah uji|lingkungan uji/i.test(`${config.name} ${config.location ?? ""}`),
  );
  const identity = Boolean(
    config?.name.trim() && isTimezone(config.timezone) && (!production || !synthetic),
  );
  const currentYear = Boolean(year);
  const weekdays = year?.weekdays ?? false;
  const classes = year?.classes ?? false;
  const missing = [
    !identity && "Identitas sekolah dan zona waktu",
    !currentYear && "Tahun ajaran aktif",
    !weekdays && "Hari belajar",
    !classes && "Kelas tahun ajaran aktif",
  ].filter((item): item is string => Boolean(item));
  const ready = missing.length === 0;
  return {
    identity,
    currentYear,
    weekdays,
    classes,
    ready,
    productionReady: ready && !synthetic,
    synthetic,
    missing,
  };
}
async function configRow(client: PoolClient, lock = false) {
  return (
    await client.query<ConfigRow>(
      `SELECT name,location,timezone,version,configured_at "configuredAt" FROM school_config WHERE id=1 ${lock ? "FOR UPDATE" : ""}`,
    )
  ).rows[0];
}
export async function getSchoolSettings(
  source: Pool = pool,
  clock: Clock = systemClock,
): Promise<SchoolSettings> {
  return transaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const config = await configRow(client);
    const hasAttendance = (
      await client.query<{ exists: boolean }>(
        "SELECT EXISTS(SELECT 1 FROM attendance_sessions) exists",
      )
    ).rows[0].exists;
    return {
      name: config?.name ?? "",
      location: config?.location ?? null,
      timezone: config?.timezone ?? "Asia/Kuala_Lumpur",
      version: config?.version ?? null,
      configuredAt: config?.configuredAt?.toISOString() ?? null,
      hasAttendance,
      serverNow: clock().toISOString(),
      setup: await setupState(client, config),
    };
  }, source);
}
export async function updateSchoolSettings(
  body: unknown,
  actor: Actor,
  requestId: string,
  source: Pool = pool,
  clock: Clock = systemClock,
) {
  assertAdmin(actor);
  const input = parseInput(settingsInputSchema, body);
  return mutationTransaction(async (client) => {
    await client.query("LOCK TABLE school_config IN SHARE ROW EXCLUSIVE MODE");
    const before = await configRow(client, true);
    assertVersion(before?.version ?? null, input.expectedVersion);
    const hasAttendance = (
      await client.query<{ exists: boolean }>(
        "SELECT EXISTS(SELECT 1 FROM attendance_sessions) exists",
      )
    ).rows[0].exists;
    if (before && input.timezone !== before.timezone && hasAttendance && !input.reason?.trim())
      throw new DomainError(
        "INVALID_INPUT",
        "Isi alasan perubahan zona waktu karena sudah ada catatan absensi.",
        400,
        { reason: ["Isi alasan perubahan zona waktu."] },
      );
    const setup = await setupState(client, input);
    const configuredAt = setup.ready ? (before?.configuredAt ?? clock()) : null;
    const saved = (
      await client.query<{ version: number }>(
        `INSERT INTO school_config(id,name,location,timezone,configured_at,updated_by,updated_at) VALUES(1,$1,$2,$3,$4,$5,$6)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,location=excluded.location,timezone=excluded.timezone,configured_at=excluded.configured_at,updated_by=excluded.updated_by,updated_at=excluded.updated_at,version=school_config.version+1 RETURNING version`,
        [input.name, input.location, input.timezone, configuredAt, actor.id, clock()],
      )
    ).rows[0];
    await audit(
      client,
      actor.id,
      "settings.update",
      "school_config",
      "1",
      requestId,
      {
        actorName: actor.name,
        before: before ?? null,
        after: {
          name: input.name,
          location: input.location,
          timezone: input.timezone,
          version: saved.version,
          configuredAt,
        },
      },
      input.reason ?? null,
    );
    return { saved: true as const, id: 1, version: saved.version };
  }, source);
}
