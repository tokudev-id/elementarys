import "server-only";
import { randomUUID } from "node:crypto";
import { DomainError } from "@/domain/errors";
import { withRequestLog, type LogWriter } from "./technical-log";

export function json(data: unknown, requestId: string = randomUUID(), status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Request-Id": requestId },
  });
}

export function errorResponse(error: unknown, requestId: string = randomUUID()) {
  const known = error instanceof DomainError;
  return json(
    {
      error: {
        code: known ? error.code : "SERVICE_UNAVAILABLE",
        message: known ? error.message : "Layanan belum tersedia. Silakan coba kembali.",
        fieldErrors: known ? error.fieldErrors : {},
      },
      requestId,
    },
    requestId,
    known ? error.status : 503,
  );
}

export function handler(
  fn: (request: Request, requestId: string) => Promise<Response>,
  action?: string,
  writer?: LogWriter,
) {
  return async (request: Request) => {
    const requestId = randomUUID();
    return withRequestLog(
      requestId,
      action ?? `request.${request.method.toLowerCase()}`,
      async () => {
        try {
          return await fn(request, requestId);
        } catch (error) {
          return errorResponse(error, requestId);
        }
      },
      writer,
    );
  };
}
