import { afterAll, beforeAll, expect, it } from "vitest";
import type { Pool } from "pg";
import { createTestDatabase } from "./harness";
import { seedTestDatabase } from "../../src/server/db/seed";
import { pool } from "../../src/server/db/pool";
import { getAuth } from "../../src/server/auth/runtime";
import { dispatchAuth } from "../../src/server/auth/dispatch";
import { GET as rosterRoute } from "../../src/app/api/classes/[classId]/attendance/route";
import { PUT as saveRoute } from "../../src/app/api/classes/[classId]/attendance/[date]/route";
import { GET as dashboardRoute } from "../../src/app/api/dashboard/route";
let source: Pool, classId: string;
let signedHeaders: Headers;
const baseURL = "http://localhost:3102";
const date = "2026-01-05";
beforeAll(async () => {
  const db = await createTestDatabase("attendance_routes");
  source = db.pool;
  pool.options.connectionString = db.url;
  process.env.BETTER_AUTH_SECRET = "SyntheticAttendanceRoutesSecret32Only";
  process.env.BETTER_AUTH_URL = baseURL;
  const fixture = await seedTestDatabase(db.url, "SyntheticTest123!", "test");
  classId = fixture.classId;
  const login = await dispatchAuth(
    new Request(`${baseURL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { origin: baseURL, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "guru@example.test", password: "SyntheticTest123!" }),
    }),
    getAuth(),
    pool,
    process.env.BETTER_AUTH_SECRET,
    baseURL,
  );
  expect(login.status).toBe(200);
  signedHeaders = new Headers({
    origin: baseURL,
    cookie: login.headers
      .getSetCookie()
      .map((s) => s.split(";")[0])
      .join("; "),
  });
}, 30000);
afterAll(async () => {
  await pool.end();
  await source?.end();
});
const url = (selectedDate = date) => `${baseURL}/api/classes/${classId}/attendance/${selectedDate}`;
const put = (body: string, origin = baseURL, selectedDate = date) =>
  saveRoute(
    new Request(url(selectedDate), {
      method: "PUT",
      headers: new Headers({ ...Object.fromEntries(signedHeaders), origin }),
      body,
    }),
  );
it("denies unauthenticated data requests and foreign mutation origin", async () => {
  expect(
    (await rosterRoute(new Request(`${baseURL}/api/classes/${classId}/attendance?date=${date}`)))
      .status,
  ).toBe(401);
  expect((await dashboardRoute(new Request(`${baseURL}/api/dashboard`))).status).toBe(401);
  expect((await put("{}", "https://foreign.example")).status).toBe(403);
});
it("GET routes are private no-store with correlation ID and never write attendance", async () => {
  for (const [route, path] of [
    [rosterRoute, `/api/classes/${classId}/attendance?date=${date}`],
    [dashboardRoute, `/api/dashboard?date=${date}`],
  ] as const) {
    const response = await route(new Request(baseURL + path, { headers: signedHeaders }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-request-id")).toMatch(/^[a-f0-9-]{36}$/);
  }
  expect((await source.query("SELECT count(*)::int n FROM attendance_sessions")).rows[0].n).toBe(0);
  expect((await source.query("SELECT count(*)::int n FROM attendance_records")).rows[0].n).toBe(0);
  expect((await source.query("SELECT count(*)::int n FROM audit_events")).rows[0].n).toBe(0);
});
it("rejects invalid dates, malformed JSON, duplicate/missing statuses and bounded payload", async () => {
  expect((await put("{}", baseURL, "2026-02-31")).status).toBe(400);
  expect((await put("{")).status).toBe(400);
  expect((await put(JSON.stringify({ expectedVersion: null, entries: [] }))).status).toBe(409);
  expect((await put(" ".repeat(128 * 1024 + 1))).status).toBe(400);
  const response = await rosterRoute(
    new Request(`${baseURL}/api/classes/${classId}/attendance?date=${date}`, {
      headers: signedHeaders,
    }),
  );
  const data = await response.json();
  const first = data.students[0].enrollmentId;
  expect(
    (
      await put(
        JSON.stringify({
          expectedVersion: null,
          entries: [
            { enrollmentId: first, status: "H" },
            { enrollmentId: first, status: "H" },
          ],
        }),
      )
    ).status,
  ).toBe(400);
  expect(
    (await put(JSON.stringify({ expectedVersion: null, entries: [{ enrollmentId: first }] })))
      .status,
  ).toBe(400);
});
it("saves through the runtime pool, returns metadata, and retries without audit duplication", async () => {
  const response = await rosterRoute(
    new Request(`${baseURL}/api/classes/${classId}/attendance?date=${date}`, {
      headers: signedHeaders,
    }),
  );
  const data = await response.json();
  const body = JSON.stringify({
    expectedVersion: null,
    entries: data.students.map((s: { enrollmentId: string }) => ({
      enrollmentId: s.enrollmentId,
      status: "I",
    })),
    reason: null,
  });
  const saved = await put(body);
  expect(saved.status).toBe(200);
  const metadata = await saved.json();
  expect(metadata).toMatchObject({
    sessionVersion: 1,
    changed: true,
    totals: { H: 0, S: 0, I: 10, A: 0 },
  });
  expect(metadata.submittedBy.name).toBe("Guru Contoh");
  expect(await (await put(body)).json()).toMatchObject({ sessionVersion: 1, changed: false });
  expect((await source.query("SELECT count(*)::int n FROM audit_events")).rows[0].n).toBe(1);
  const dashboard = await (
    await dashboardRoute(
      new Request(`${baseURL}/api/dashboard?date=${date}`, { headers: signedHeaders }),
    )
  ).json();
  expect(dashboard.classes[0]).toMatchObject({
    state: "submitted",
    presentCount: 0,
    totals: { H: 0, S: 0, I: 10, A: 0 },
  });
});
