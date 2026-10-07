import { test, expect } from "@playwright/test";
test("component preview denied in production", async ({ request }) => {
  expect(process.env.APP_ENV).toBe("production");
  const response = await request.get("/component-preview");
  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain("Status contoh");
});
