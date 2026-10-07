import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { config } from "dotenv";
import { Pool } from "pg";
import { attendanceSaveSchema, attendanceViewSchema } from "../src/contracts/attendance-view";
import { schoolToday } from "../src/domain/calendar";
import { assertLocalTestDatabase } from "../src/server/db/safety";
import { seedTestDatabase } from "../src/server/db/seed";
import { createTestDatabase } from "../tests/integration/harness";

config({ path: ".env.local", quiet: true });

function startServer(port: number, databaseUrl: string): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        env: {
          ...process.env,
          APP_ENV: "production",
          DATABASE_URL: databaseUrl,
          BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
          BETTER_AUTH_URL: `http://localhost:${port}`,
          TRUSTED_ORIGINS: `http://localhost:${port}`,
        },
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Server pengukuran belum siap setelah 30 detik."));
    }, 30_000);
    function fail() {
      clearTimeout(timeout);
      reject(new Error("Server pengukuran gagal berjalan. Jalankan pnpm build terlebih dahulu."));
    }
    child.once("error", fail);
    child.once("exit", fail);
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      if (!chunk.includes("Ready in")) return;
      clearTimeout(timeout);
      child.removeListener("error", fail);
      child.removeListener("exit", fail);
      resolve(child);
    });
  });
}

async function timedRequest(url: string, options: RequestInit = {}) {
  const start = performance.now();
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(20_000) });
  const text = await response.text();
  if (!response.ok) throw new Error(`Pengukuran gagal: HTTP ${response.status}.`);
  return { response, text, durationMs: Math.round((performance.now() - start) * 100) / 100 };
}

export async function measureAttendance() {
  if (process.env.APP_ENV !== "test")
    throw new Error("Pengukuran hanya untuk APP_ENV=test dan data sintetis lokal.");
  const port = Number(process.env.MEASUREMENT_PORT ?? "3103");
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("Port pengukuran tidak valid.");
  const database = await createTestDatabase("s1_07_measure");
  const name = assertLocalTestDatabase(database.url);
  const password = randomBytes(24).toString("base64url");
  let server: ChildProcess | undefined;
  try {
    await seedTestDatabase(database.url, password, "test");
    const classId: string = (await database.pool.query("SELECT id FROM classes LIMIT 1")).rows[0]
      .id;
    const date = schoolToday("Asia/Kuala_Lumpur");
    await database.pool.query(
      "INSERT INTO school_day_overrides(academic_year_id,date,is_school_day,reason) SELECT id,$1,true,'Pengukuran sintetis lokal' FROM academic_years WHERE is_current",
      [date],
    );
    server = await startServer(port, database.url);
    const base = `http://localhost:${port}`;
    const opening = await timedRequest(`${base}/login`);
    const login = await timedRequest(`${base}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base },
      body: JSON.stringify({ email: "guru@example.test", password }),
    });
    const cookie = login.response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    if (!cookie) throw new Error("Server tidak memberikan sesi untuk pengukuran.");
    const page = await timedRequest(`${base}/attendance/${classId}?date=${date}`, {
      headers: { Cookie: cookie },
    });
    const roster = await timedRequest(`${base}/api/classes/${classId}/attendance?date=${date}`, {
      headers: { Cookie: cookie },
    });
    const view = attendanceViewSchema.parse(JSON.parse(roster.text));
    const entries = view.students.map((student) => ({
      enrollmentId: student.enrollmentId,
      status: "H" as "H" | "A",
    }));
    let version: number | null = null;
    const samples: number[] = [];
    for (let index = 0; index < 10; index++) {
      entries[0].status = index % 2 === 0 ? "A" : "H";
      const result = await timedRequest(`${base}/api/classes/${classId}/attendance/${date}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Origin: base, Cookie: cookie },
        body: JSON.stringify({
          expectedVersion: version,
          entries,
          reason: "Pengukuran sintetis lokal",
        }),
      });
      const saved = attendanceSaveSchema.parse(JSON.parse(result.text));
      if (!saved.changed) throw new Error("Sampel pengukuran harus mengubah catatan, bukan no-op.");
      version = saved.sessionVersion;
      samples.push(result.durationMs);
    }
    const sorted = [...samples].sort((left, right) => left - right);
    return {
      environment: "local production build, APP_ENV=production, synthetic PostgreSQL test database",
      coldCondition:
        "fresh Next.js process; PostgreSQL remains running; no provider cold-start measurement",
      measuredAt: new Date().toISOString(),
      students: entries.length,
      firstLoginPageMs: opening.durationMs,
      loginMs: login.durationMs,
      firstAttendancePageMs: page.durationMs,
      warmSaveSamplesMs: samples,
      warmSaveP95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
    };
  } finally {
    if (server && server.exitCode === null) {
      const closed = once(server, "close");
      server.kill();
      await closed;
    }
    await database.pool.end();
    const adminUrl = new URL(database.url);
    adminUrl.pathname = "/postgres";
    const admin = new Pool({ connectionString: adminUrl.toString(), max: 1 });
    try {
      await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    } finally {
      await admin.end();
    }
  }
}

console.log(JSON.stringify(await measureAttendance(), null, 2));
