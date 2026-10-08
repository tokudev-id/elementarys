import { test, expect } from "./fixtures";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { createAuth } from "../../src/server/auth/factory";
import { createManagedAccount } from "../../src/server/auth/accounts";
import { assertLocalTestDatabase } from "../../src/server/db/safety";
import { schoolToday } from "../../src/domain/calendar";

test("every exported API method follows the role/session matrix, including reports, void, audit and auth plugin paths", async ({
  request,
}) => {
  test.setTimeout(120000);
  assertLocalTestDatabase(process.env.DATABASE_URL!);
  const source = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  try {
    const base = process.env.BETTER_AUTH_URL!;
    const auth = createAuth(source, process.env.BETTER_AUTH_SECRET!, base);
    const year = (await source.query("SELECT id FROM academic_years WHERE is_current")).rows[0].id;
    const classId = (
      await source.query("SELECT id FROM classes WHERE academic_year_id=$1 LIMIT 1", [year])
    ).rows[0].id;
    const student = (
      await source.query(
        "SELECT student_id id,id enrollment_id FROM enrollments WHERE class_id=$1 LIMIT 1",
        [classId],
      )
    ).rows[0];
    const teacher = (await source.query("SELECT id,user_id FROM teachers LIMIT 1")).rows[0];
    const date = schoolToday(
      (await source.query("SELECT timezone FROM school_config")).rows[0].timezone,
    );
    const queries = `yearId=${year}&month=${date.slice(0, 7)}&classId=${classId}`;
    const cases: {
      template: string;
      method: string;
      path: string;
      teacher: number;
      admin: number;
    }[] = [
      ...["me", "dashboard", "settings", "academic-years", "classes", "students", "teachers"].map(
        (path) => ({
          template: `/api/${path}`,
          method: "GET",
          path: `/api/${path}`,
          teacher: 200,
          admin: 200,
        }),
      ),
      {
        template: "/api/students/[studentId]",
        method: "GET",
        path: `/api/students/${student.id}`,
        teacher: 200,
        admin: 200,
      },
      {
        template: "/api/classes/[classId]/attendance",
        method: "GET",
        path: `/api/classes/${classId}/attendance?date=${date}`,
        teacher: 200,
        admin: 200,
      },
      {
        template: "/api/classes/[classId]/attendance/[date]/history",
        method: "GET",
        path: `/api/classes/${classId}/attendance/${date}/history`,
        teacher: 200,
        admin: 200,
      },
      {
        template: "/api/academic-years/[yearId]/calendar",
        method: "GET",
        path: `/api/academic-years/${year}/calendar?month=${date.slice(0, 7)}`,
        teacher: 200,
        admin: 200,
      },
      {
        template: "/api/reports/attendance",
        method: "GET",
        path: `/api/reports/attendance?${queries}`,
        teacher: 200,
        admin: 200,
      },
      {
        template: "/api/reports/attendance.xlsx",
        method: "GET",
        path: `/api/reports/attendance.xlsx?${queries}`,
        teacher: 200,
        admin: 200,
      },
      { template: "/api/audit", method: "GET", path: "/api/audit", teacher: 403, admin: 200 },
      ...["academic-years", "classes", "students", "teachers"].map((path) => ({
        template: `/api/${path}`,
        method: "POST",
        path: `/api/${path}`,
        teacher: 403,
        admin: 400,
      })),
      {
        template: "/api/settings",
        method: "PATCH",
        path: "/api/settings",
        teacher: 403,
        admin: 400,
      },
      {
        template: "/api/academic-years/[yearId]",
        method: "PATCH",
        path: `/api/academic-years/${year}`,
        teacher: 403,
        admin: 400,
      },
      {
        template: "/api/academic-years/[yearId]/calendar",
        method: "PUT",
        path: `/api/academic-years/${year}/calendar`,
        teacher: 403,
        admin: 400,
      },
      {
        template: "/api/classes/[classId]",
        method: "PATCH",
        path: `/api/classes/${classId}`,
        teacher: 403,
        admin: 400,
      },
      {
        template: "/api/students/[studentId]",
        method: "PATCH",
        path: `/api/students/${student.id}`,
        teacher: 403,
        admin: 400,
      },
      {
        template: "/api/students/[studentId]/enrollments",
        method: "POST",
        path: `/api/students/${student.id}/enrollments`,
        teacher: 403,
        admin: 400,
      },
      {
        template: "/api/enrollments/[enrollmentId]/end",
        method: "PATCH",
        path: `/api/enrollments/${student.enrollment_id}/end`,
        teacher: 403,
        admin: 400,
      },
      {
        template: "/api/enrollments/promote/preview",
        method: "POST",
        path: "/api/enrollments/promote/preview",
        teacher: 403,
        admin: 400,
      },
      {
        template: "/api/enrollments/promote",
        method: "POST",
        path: "/api/enrollments/promote",
        teacher: 403,
        admin: 400,
      },
      {
        template: "/api/teachers/[teacherId]",
        method: "PATCH",
        path: `/api/teachers/${teacher.id}`,
        teacher: 403,
        admin: 400,
      },
      {
        template: "/api/teachers/[teacherId]/classes",
        method: "PUT",
        path: `/api/teachers/${teacher.id}/classes`,
        teacher: 403,
        admin: 400,
      },
      {
        template: "/api/teachers/[teacherId]/account",
        method: "POST",
        path: `/api/teachers/${teacher.id}/account`,
        teacher: 403,
        admin: 400,
      },
      {
        template: "/api/users/[userId]/access",
        method: "PATCH",
        path: `/api/users/${teacher.user_id}/access`,
        teacher: 403,
        admin: 400,
      },
      {
        template: "/api/users/[userId]/reset-password",
        method: "POST",
        path: `/api/users/${teacher.user_id}/reset-password`,
        teacher: 403,
        admin: 400,
      },
      {
        template: "/api/account/change-password",
        method: "POST",
        path: "/api/account/change-password",
        teacher: 400,
        admin: 400,
      },
      {
        template: "/api/classes/[classId]/attendance/[date]",
        method: "PUT",
        path: `/api/classes/${classId}/attendance/${date}`,
        teacher: 400,
        admin: 400,
      },
      {
        template: "/api/classes/[classId]/attendance/[date]/void",
        method: "POST",
        path: `/api/classes/${classId}/attendance/${date}/void`,
        teacher: 403,
        admin: 400,
      },
      {
        template: "/api/reports/exports",
        method: "POST",
        path: "/api/reports/exports",
        teacher: 400,
        admin: 400,
      },
    ];
    const covered = new Set(cases.map((item) => `${item.method} ${item.template}`));
    for (const method of ["GET", "POST"]) covered.add(`${method} /api/auth/[...all]`);
    covered.add("GET /api/health");
    const root = join(process.cwd(), "src/app/api");
    const discovered = new Set<string>();
    for (const path of await readdir(root, { recursive: true })) {
      if (!path.endsWith("route.ts")) continue;
      const content = await readFile(join(root, path), "utf8");
      const template = `/api/${path.replaceAll("\\", "/").replace(/\/route\.ts$/, "")}`;
      for (const match of content.matchAll(
        /export\s+(?:const|function)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g,
      ))
        discovered.add(`${match[1]} ${template}`);
    }
    expect([...covered].sort()).toEqual([...discovered].sort());
    const cookies: Record<string, string> = { anon: "" };
    const states = ["teacher", "admin", "temp", "inactive", "disabled", "expired"];
    for (const state of states) {
      const account = await createManagedAccount(auth, {
        name: `Matrix ${state}`,
        email: `matrix-${state}-${randomUUID()}@example.test`,
        password: "MatrixSynthetic123!",
        role: state === "admin" ? "admin" : "teacher",
        mustChangePassword: state === "temp",
      });
      await source.query("INSERT INTO teachers(user_id,full_name) VALUES($1,$2)", [
        account.user.id,
        `Matrix ${state}`,
      ]);
      const signed = await auth.api.signInEmail({
        body: { email: account.user.email, password: "MatrixSynthetic123!" },
        asResponse: true,
      });
      expect(signed.status).toBe(200);
      cookies[state] = signed.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
      if (state === "inactive")
        await source.query("UPDATE teachers SET active=false WHERE user_id=$1", [account.user.id]);
      if (state === "disabled")
        await source.query('UPDATE "user" SET banned=true WHERE id=$1', [account.user.id]);
      if (state === "expired")
        await source.query('DELETE FROM "session" WHERE user_id=$1', [account.user.id]);
    }
    for (const [state, cookie] of Object.entries(cookies)) {
      for (const item of cases) {
        const expected =
          state === "anon" || state === "expired"
            ? 401
            : ["temp", "inactive", "disabled"].includes(state) &&
                item.path !== "/api/account/change-password"
              ? 403
              : ["inactive", "disabled"].includes(state)
                ? 403
                : state === "admin"
                  ? item.admin
                  : item.teacher;
        const response = await request.fetch(item.path, {
          method: item.method,
          headers: { cookie, origin: base },
          ...(item.method !== "GET" ? { data: {} } : {}),
        });
        expect(response.status(), `${state} ${item.method} ${item.path}`).toBe(expected);
        expect(response.headers()["cache-control"]).toBe("private, no-store");
      }
      for (const path of [
        "/sign-up/email",
        "/admin/create-user",
        "/admin/ban-user",
        "/admin/set-role",
        "/admin/impersonate-user",
        "/admin/remove-user",
        "/update-user",
        "/set-password",
      ]) {
        expect(
          (
            await request.post(`/api/auth${path}`, { headers: { cookie, origin: base }, data: {} })
          ).status(),
          `${state} auth ${path}`,
        ).toBe(403);
      }
    }
    expect((await request.get("/api/health")).status()).toBe(200);
    expect((await request.get("/api/auth/get-session")).status()).toBe(200);
    expect(
      (
        await request.post("/api/auth/sign-in/email", { headers: { origin: base }, data: {} })
      ).status(),
    ).toBe(400);
  } finally {
    await source.end();
  }
});
