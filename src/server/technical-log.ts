import { AsyncLocalStorage } from "node:async_hooks";
import { sanitizeTechnicalLog, type TechnicalLog } from "@/domain/technical-log";
type RequestContext = { requestId: string; actorId: string | null; action: string };
const context = new AsyncLocalStorage<RequestContext>();
export type LogWriter = (entry: TechnicalLog) => void;
export function writeTechnicalLog(input: Record<string, unknown>) {
  if (process.env.APP_ENV === "test" && process.env.APP_LOG_TEST !== "1") return;
  console.info(JSON.stringify(sanitizeTechnicalLog(input)));
}
export function recordRequestActor(id: string) {
  const value = context.getStore();
  if (value) value.actorId = id;
}
export function recordRequestAction(action: string) {
  const value = context.getStore();
  if (value) value.action = action;
}
export async function withRequestLog(
  requestId: string,
  action: string,
  execute: () => Promise<Response>,
  writer: LogWriter = writeTechnicalLog,
) {
  return context.run({ requestId, actorId: null, action }, async () => {
    const started = performance.now();
    const response = await execute();
    let errorCode: unknown = null;
    if (!response.ok) {
      const body: unknown = await response
        .clone()
        .json()
        .catch(() => null);
      if (typeof body === "object" && body !== null) {
        const value = "error" in body ? body.error : body;
        if (typeof value === "object" && value !== null && "code" in value) errorCode = value.code;
      }
      errorCode ??= "HTTP_ERROR";
    }
    const value = context.getStore()!;
    const entry = sanitizeTechnicalLog({
      requestId,
      actorId: value.actorId,
      action: value.action,
      durationMs: performance.now() - started,
      errorCode,
    });
    try {
      writer(entry);
    } catch {
      /* Logging must not change an already committed response. */
    }
    response.headers.set("X-Request-Id", requestId);
    return response;
  });
}
