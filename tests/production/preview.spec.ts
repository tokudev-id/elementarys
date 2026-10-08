import { test, expect } from "@playwright/test";
test("component preview denied in production", async ({ request }) => {
  expect(process.env.APP_ENV).toBe("production");
  expect(test.info().project.use.baseURL).toBe(`http://localhost:${process.env.PORT ?? "3101"}`);
  const response = await request.get("/component-preview");
  expect(await response.text()).not.toContain("Status contoh");
  expect(response.status()).toBe(404);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
});
