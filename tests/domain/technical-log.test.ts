import { it, expect } from "vitest";
import { sanitizeTechnicalLog } from "../../src/domain/technical-log";
it("technical logging keeps only approved metadata and rejects untrusted error/action values", () => {
  const result = sanitizeTechnicalLog({
    requestId: "f945672e-b46e-4187-83e7-8d9e9d0c34be",
    actorId: "actor-1",
    action: "student.update",
    durationMs: 12.3456,
    errorCode: "INVALID_INPUT",
    password: "credential-do-not-log",
    token: "token-do-not-log",
    studentName: "Private Student",
    body: { fullName: "Private Student" },
    headers: { cookie: "token-do-not-log" },
    stack: "SQL private payload",
  });
  expect(result).toEqual({
    requestId: "f945672e-b46e-4187-83e7-8d9e9d0c34be",
    actorId: "actor-1",
    action: "student.update",
    durationMs: 12.35,
    errorCode: "INVALID_INPUT",
  });
  expect(JSON.stringify(result)).not.toMatch(
    /credential-do-not-log|token-do-not-log|Private Student|SQL private payload/,
  );
  expect(
    sanitizeTechnicalLog({
      requestId: "bad",
      actorId: "Name with spaces",
      action: "Untrusted Name",
      durationMs: Infinity,
      errorCode: "PRIVATE_NAME",
    }),
  ).toEqual({
    requestId: null,
    actorId: null,
    action: "domain.request",
    durationMs: null,
    errorCode: "HTTP_ERROR",
  });
});
