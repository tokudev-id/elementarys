import "server-only";
import type { Pool } from "pg";
import type { Actor } from "@/server/auth/guards";
import {
  auditFilterSchema,
  auditCursorSchema,
  type AuditFilter,
  type AuditPage,
} from "@/contracts/audit";
import { parseInput } from "@/contracts/attendance";
import { DomainError } from "@/domain/errors";
import { isTimezone } from "@/domain/calendar";
import { assertAdmin } from "@/server/mutations";
import { pool, transaction } from "@/server/db/pool";

type EventRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  occurredAt: Date;
  actorId: string;
  actorName: string;
  requestId: string | null;
  reason: string | null;
  changes: { before?: unknown; after?: unknown };
  cursorAt: string;
};
export function auditQuery(url: URL): AuditFilter {
  const values = url.searchParams;
  return {
    entityType: (values.get("entityType") as AuditFilter["entityType"]) || undefined,
    entityId: values.get("entityId") || undefined,
    actorId: values.get("actorId") || undefined,
    from: values.get("from") || undefined,
    to: values.get("to") || undefined,
    cursor: values.get("cursor") || undefined,
    limit: values.has("limit") ? Number(values.get("limit")) : undefined,
  };
}
export async function getAuditPage(
  filter: AuditFilter,
  actor: Actor,
  source: Pool = pool,
): Promise<AuditPage> {
  assertAdmin(actor);
  const input = parseInput(auditFilterSchema, filter);
  let cursor: { at: string; id: string } | undefined;
  if (input.cursor) {
    let decoded: unknown;
    try {
      decoded = JSON.parse(Buffer.from(input.cursor, "base64url").toString("utf8"));
    } catch {
      throw new DomainError("INVALID_INPUT", "Cursor audit tidak valid.");
    }
    cursor = parseInput(auditCursorSchema, decoded);
  }
  return transaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const zone = (
      await client.query<{ timezone: string }>("SELECT timezone FROM school_config WHERE id=1")
    ).rows[0]?.timezone;
    const timezone = zone && isTimezone(zone) ? zone : "Asia/Kuala_Lumpur";
    const rows = (
      await client.query<EventRow>(
        `WITH events AS (
        SELECT h.id,h.action,h.entity_type "entityType",h.entity_id "entityId",h.occurred_at "occurredAt",h.actor_id "actorId",COALESCE(h.changes_json->>'actorName',u.name) "actorName",h.request_id "requestId",h.reason,h.changes_json changes FROM audit_events h JOIN "user" u ON u.id=h.actor_id
        UNION ALL SELECT x.id,'report.export.'||x.format,'report_export',COALESCE(x.class_id::text,x.academic_year_id::text),x.exported_at,x.exported_by,u.name,NULL,NULL,jsonb_build_object('before',NULL,'after',jsonb_build_object('academicYearId',x.academic_year_id,'month',to_char(x.month,'YYYY-MM'),'classId',x.class_id,'format',x.format,'sessionVersions',x.session_versions)) FROM report_exports x JOIN "user" u ON u.id=x.exported_by
      ) SELECT *,to_char("occurredAt" AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') "cursorAt" FROM events WHERE ($1::text IS NULL OR "entityType"=$1) AND ($2::text IS NULL OR "entityId"=$2) AND ($3::text IS NULL OR "actorId"=$3)
      AND ($4::date IS NULL OR "occurredAt">=($4::date::timestamp AT TIME ZONE $8)) AND ($5::date IS NULL OR "occurredAt"<(($5::date+1)::timestamp AT TIME ZONE $8))
      AND ($6::timestamptz IS NULL OR ("occurredAt",id)<($6::timestamptz,$7::uuid)) ORDER BY "occurredAt" DESC,id DESC LIMIT $9`,
        [
          input.entityType ?? null,
          input.entityId ?? null,
          input.actorId ?? null,
          input.from ?? null,
          input.to ?? null,
          cursor?.at ?? null,
          cursor?.id ?? null,
          timezone,
          input.limit + 1,
        ],
      )
    ).rows;
    const selected = rows.slice(0, input.limit);
    const last = selected.at(-1);
    return {
      timezone,
      events: selected.map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        occurredAt: row.occurredAt.toISOString(),
        actor: { id: row.actorId, name: row.actorName },
        requestId: row.requestId,
        reason: row.reason,
        before: row.changes.before ?? null,
        after: row.changes.after ?? null,
      })),
      nextCursor:
        rows.length > input.limit && last
          ? Buffer.from(JSON.stringify({ at: last.cursorAt, id: last.id })).toString("base64url")
          : null,
    };
  }, source);
}
export async function auditActors(actor: Actor, source: Pool = pool) {
  assertAdmin(actor);
  return (
    await source.query<{ id: string; name: string }>('SELECT id,name FROM "user" ORDER BY name,id')
  ).rows;
}
