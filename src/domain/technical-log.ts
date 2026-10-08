const errorCodes = new Set([
  "INVALID_INPUT",
  "ACCESS_DENIED",
  "SESSION_EXPIRED",
  "PASSWORD_CHANGE_REQUIRED",
  "VERSION_CONFLICT",
  "ROSTER_CHANGED",
  "HISTORICAL_ROSTER_CHANGE",
  "CALENDAR_HAS_ATTENDANCE",
  "OUTSIDE_ACADEMIC_YEAR",
  "HOLIDAY",
  "FUTURE_DATE",
  "EMPTY_ROSTER",
  "SETUP_INCOMPLETE",
  "RESOURCE_NOT_FOUND",
  "RATE_LIMITED",
  "LAST_ACTIVE_ADMIN",
  "SERVICE_UNAVAILABLE",
  "INVALID_EMAIL_OR_PASSWORD",
  "HTTP_ERROR",
]);
export type TechnicalLog = {
  requestId: string | null;
  actorId: string | null;
  action: string;
  durationMs: number | null;
  errorCode: string | null;
};
export function sanitizeTechnicalLog(input: Record<string, unknown>): TechnicalLog {
  return {
    requestId:
      typeof input.requestId === "string" && /^[0-9a-f-]{36}$/i.test(input.requestId)
        ? input.requestId
        : null,
    actorId:
      typeof input.actorId === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(input.actorId)
        ? input.actorId
        : null,
    action:
      typeof input.action === "string" && /^[a-z][a-z0-9.-]{0,63}$/.test(input.action)
        ? input.action
        : "domain.request",
    durationMs:
      typeof input.durationMs === "number" &&
      Number.isFinite(input.durationMs) &&
      input.durationMs >= 0
        ? Math.round(input.durationMs * 100) / 100
        : null,
    errorCode:
      input.errorCode == null
        ? null
        : typeof input.errorCode === "string" && errorCodes.has(input.errorCode)
          ? input.errorCode
          : "HTTP_ERROR",
  };
}
