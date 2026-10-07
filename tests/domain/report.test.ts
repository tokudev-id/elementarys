import { expect, it } from "vitest";
import { monthDates, reportCell, summarizeCells } from "../../src/domain/report";

it("handles leap months and marker priority without counting missing, future or holidays as absence", () => {
  expect(monthDates("2024-02")).toHaveLength(29);
  expect(monthDates("2025-02")).toHaveLength(28);
  expect(monthDates("2026-04")).toHaveLength(30);
  expect(() => monthDates("2026-13")).toThrow();
  expect(reportCell("2026-10-08", false, false, "2026-10-07", "A")).toBe("-");
  expect(reportCell("2026-10-08", true, false, "2026-10-07", "A")).toBe("L");
  expect(reportCell("2026-10-08", true, true, "2026-10-07", "A")).toBe(".");
  expect(reportCell("2026-10-07", true, true, "2026-10-07", undefined)).toBe("?");
  expect(summarizeCells(["H", "S", "I", "A", "?", "L", "-", "."])).toEqual({
    totals: { H: 1, S: 1, I: 1, A: 1 },
    missingDays: 1,
    recordedDays: 4,
    expectedDaysToDate: 5,
  });
});
