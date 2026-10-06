import { expect, it } from "vitest";
import { assertLocalTestDatabase } from "../../src/server/db/safety";

it("menolak seed/reset pada env produksi, hostname cloud dan nama bukan uji", () => {
  expect(() => assertLocalTestDatabase("postgresql://test@localhost/elementary_test_dev", "production")).toThrow();
  expect(() => assertLocalTestDatabase("postgresql://test@ep-example.neon.tech/elementary_test_dev", "test")).toThrow();
  expect(() => assertLocalTestDatabase("postgresql://test@localhost/school", "test")).toThrow();
  expect(assertLocalTestDatabase("postgresql://test@127.0.0.1:55433/elementary_test_dev", "test")).toBe("elementary_test_dev");
});
