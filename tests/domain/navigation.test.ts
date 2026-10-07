import { describe, it, expect } from "vitest";
import { navigation, availableNavigation } from "../../src/components/navigation";
describe("navigation readiness and role", () => {
  it("never exposes unimplemented routes", () => {
    for (const role of ["teacher", "admin"] as const) expect(availableNavigation(role).every(item => item.ready && item.roles.includes(role))).toBe(true);
    expect(availableNavigation("teacher").map(item => item.href)).toEqual(["/attendance", "/change-password"]);
  });
  it("keeps read access and admin destinations explicit for future activation", () => {
    for (const id of ["settings", "setup", "audit"]) expect(navigation.find(item => item.id === id)?.roles).toEqual(["admin"]);
    for (const id of ["students", "teachers", "classes", "calendar", "academic-years"]) expect(navigation.find(item => item.id === id)?.roles).toContain("teacher");
    expect(new Set(navigation.map(item => item.id)).size).toBe(navigation.length);
  });
});
