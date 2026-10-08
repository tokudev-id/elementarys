import { z } from "zod";

const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  }),
});
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "HttpError";
  }
}
export async function responseError(response: Response) {
  const parsed = errorSchema.safeParse(await response.json().catch(() => null));
  return new HttpError(
    response.status,
    parsed.success ? parsed.data.error.code : "SERVICE_UNAVAILABLE",
    parsed.success ? parsed.data.error.message : "Belum dapat menerima jawaban server.",
    parsed.success ? parsed.data.error.fieldErrors : {},
  );
}
export async function requestJson<T>(
  url: string,
  options: RequestInit,
  schema: z.ZodType<T>,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    signal: options.signal ?? AbortSignal.timeout(20000),
  });
  if (!response.ok) throw await responseError(response);
  return schema.parse(await response.json());
}
