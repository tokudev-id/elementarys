import { describe, expect, it } from "vitest";
import { DomainError } from "../../src/domain/errors";

describe("kesalahan domain", () => {
  it("mempertahankan kode, status, dan kesalahan field", () => {
    const error = new DomainError("INVALID_INPUT", "Periksa tanggal.", 400, {
      date: ["Tanggal tidak valid"],
    });
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("INVALID_INPUT");
    expect(error.status).toBe(400);
    expect(error.fieldErrors.date).toEqual(["Tanggal tidak valid"]);
  });
});
