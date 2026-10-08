import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { createTestDatabase, resetDatabase } from "./harness";
import { seedTestDatabase } from "../../src/server/db/seed";
import { getAuditPage, auditActors } from "../../src/server/queries/audit";
import { audit, transaction } from "../../src/server/db/pool";
import { handler, json } from "../../src/server/http";
import { recordRequestActor, recordRequestAction } from "../../src/server/technical-log";
import { DomainError } from "../../src/domain/errors";
import type { TechnicalLog } from "../../src/domain/technical-log";
import type { Actor } from "../../src/server/auth/guards";
let source: Pool;
let actor: Actor;
beforeAll(async () => {
  source = (await createTestDatabase("audit")).pool;
}, 30000);
afterAll(async () => {
  await source?.end();
});
beforeEach(async () => {
  await resetDatabase(source);
  const seed = await seedTestDatabase(
    String(source.options.connectionString),
    randomUUID(),
    "test",
  );
  actor = {
    id: seed.adminId,
    name: "Actor Snapshot",
    role: "admin",
    teacherId: null,
    mustChangePassword: false,
  };
});
async function event(index: number) {
  await source.query(
    "INSERT INTO audit_events(id,actor_id,action,entity_type,entity_id,occurred_at,request_id,reason,changes_json) VALUES($1,$2,'student.update','student',$3,'2026-10-07T16:30:00.123456Z',$4,'Alasan uji',$5)",
    [
      randomUUID(),
      actor.id,
      `entity-${index}`,
      randomUUID(),
      { actorName: actor.name, before: { name: "Nama lama" }, after: { name: "Nama baru" } },
    ],
  );
}
it("stable cursor preserves microseconds and pages tied timestamps without missing/duplicate events", async () => {
  for (let index = 0; index < 43; index++) await event(index);
  await source.query("UPDATE \"user\" SET name='Renamed Actor' WHERE id=$1", [actor.id]);
  const ids: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await getAuditPage({ limit: 7, cursor }, actor, source);
    expect(page.events.every((value) => value.actor.name === actor.name)).toBe(true);
    ids.push(...page.events.map((value) => value.id));
    if (page.nextCursor)
      expect(JSON.parse(Buffer.from(page.nextCursor, "base64url").toString()).at).toContain(
        ".123456Z",
      );
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  expect(ids).toHaveLength(43);
  expect(new Set(ids).size).toBe(43);
  expect(
    (
      await getAuditPage(
        {
          entityType: "student",
          entityId: "entity-1",
          actorId: actor.id,
          from: "2026-10-08",
          to: "2026-10-08",
        },
        actor,
        source,
      )
    ).events,
  ).toHaveLength(1);
  expect(
    (await getAuditPage({ from: "2026-10-07", to: "2026-10-07" }, actor, source)).events,
  ).toEqual([]);
});
it("audit combines export ledger and mutation snapshots and denies teacher access before queries", async () => {
  await transaction(async (client) => {
    await audit(
      client,
      actor.id,
      "student.update",
      "student",
      "entity-1",
      randomUUID(),
      { actorName: actor.name, before: { code: "OLD" }, after: { code: "NEW" } },
      "Perbaikan kode",
    );
  }, source);
  const year = (await source.query("SELECT id FROM academic_years LIMIT 1")).rows[0].id;
  await source.query(
    "INSERT INTO report_exports(academic_year_id,month,format,session_versions,exported_by) VALUES($1,'2026-10-01','xlsx','{}',$2)",
    [year, actor.id],
  );
  const result = await getAuditPage({}, actor, source);
  expect(result.events).toHaveLength(2);
  expect(result.events.find((value) => value.action === "student.update")).toMatchObject({
    actor: { id: actor.id, name: actor.name },
    reason: "Perbaikan kode",
    before: { code: "OLD" },
    after: { code: "NEW" },
  });
  expect(result.events.find((value) => value.entityType === "report_export")?.after).toMatchObject({
    format: "xlsx",
    month: "2026-10",
    sessionVersions: {},
  });
  const teacher = { ...actor, role: "teacher" as const };
  await expect(getAuditPage({}, teacher, source)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  await expect(auditActors(teacher, source)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  await expect(getAuditPage({ cursor: "notvalid" }, actor, source)).rejects.toMatchObject({
    code: "INVALID_INPUT",
  });
  await expect(getAuditPage({ limit: 101 }, actor, source)).rejects.toMatchObject({
    code: "INVALID_INPUT",
  });
});
it("concurrent HTTP requests log isolated correlation/actor/action metadata without body, cookies, SQL or names", async () => {
  const entries: TechnicalLog[] = [];
  const route = handler(
    async (request, id) => {
      const body = await request.json();
      recordRequestActor(body.actorId);
      recordRequestAction("student.update");
      await new Promise((resolve) => setTimeout(resolve, body.delay));
      if (body.fail)
        throw new DomainError(
          "INVALID_INPUT",
          "Private student name is not a technical log field.",
        );
      return json({ saved: true }, id);
    },
    "request.post",
    (entry) => {
      entries.push(entry);
    },
  );
  const responses = await Promise.all(
    [true, false].map((fail, index) =>
      route(
        new Request("http://localhost/api/students?token=do-not-log", {
          method: "POST",
          headers: { cookie: "private-cookie" },
          body: JSON.stringify({
            actorId: `actor-${index}`,
            delay: index === 0 ? 15 : 0,
            fail,
            password: "private-password",
            fullName: "Private student name",
          }),
        }),
      ),
    ),
  );
  expect(entries).toHaveLength(2);
  for (let index = 0; index < responses.length; index++) {
    const value = entries.find(
      (entry) => entry.requestId === responses[index].headers.get("x-request-id"),
    )!;
    expect(value.actorId).toBe(`actor-${index}`);
    expect(value.action).toBe("student.update");
    expect(value.errorCode).toBe(index === 0 ? "INVALID_INPUT" : null);
    expect(value.durationMs).toBeGreaterThanOrEqual(0);
  }
  expect(JSON.stringify(entries)).not.toMatch(
    /Private student name|private-password|private-cookie|do-not-log/,
  );
  const failedLogger = handler(
    async (_, id) => json({ saved: true }, id),
    "request.post",
    () => {
      throw new Error("collector down");
    },
  );
  expect(
    (await failedLogger(new Request("http://localhost/api/students", { method: "POST" }))).status,
  ).toBe(200);
});
