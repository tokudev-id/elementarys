import { z } from "zod";
import type { AttendanceInput } from "@/contracts/attendance";
import {
  attendanceSaveSchema,
  attendanceViewSchema,
  type AttendanceView,
  type AttendanceSave,
} from "@/contracts/attendance-view";

const errorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export class AttendanceRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AttendanceRequestError";
  }
}

async function readResponse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = errorSchema.safeParse(body);
    throw new AttendanceRequestError(
      response.status,
      error.success ? error.data.error.code : "SERVICE_UNAVAILABLE",
      error.success ? error.data.error.message : "Belum dapat menerima catatan dari server.",
    );
  }
  return schema.parse(body);
}

export interface AttendanceClient {
  load(classId: string, date: string): Promise<AttendanceView>;
  save(classId: string, date: string, input: AttendanceInput): Promise<AttendanceSave>;
}

export const attendanceClient: AttendanceClient = {
  async load(classId, date) {
    const response = await fetch(
      `/api/classes/${classId}/attendance?date=${encodeURIComponent(date)}`,
      { cache: "no-store", signal: AbortSignal.timeout(20000) },
    );
    return readResponse(response, attendanceViewSchema);
  },
  async save(classId, date, input) {
    const response = await fetch(`/api/classes/${classId}/attendance/${date}`, {
      method: "PUT",
      signal: AbortSignal.timeout(20000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return readResponse(response, attendanceSaveSchema);
  },
};
