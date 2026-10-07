import { handler, json } from "@/server/http";
import { requireActor, requireOrigin } from "@/server/auth/guards";
import { attendanceInputSchema, attendancePathSchema, parseInput } from "@/contracts/attendance";
import { DomainError } from "@/domain/errors";
import { saveAttendance } from "@/server/services/attendance/save";
export const PUT = handler(async (request, requestId) => {
  requireOrigin(request);
  const actor = await requireActor(request.headers);
  const segments = new URL(request.url).pathname.split("/");
  const path = parseInput(attendancePathSchema, { classId: segments[3], date: segments[5] });
  const limit = 128 * 1024;
  if (Number(request.headers.get("content-length")) > limit)
    throw new DomainError("INVALID_INPUT", "Permintaan terlalu besar.", 400);
  const reader = request.body?.getReader();
  if (!reader) throw new DomainError("INVALID_INPUT", "Isi permintaan wajib.", 400);
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new DomainError("INVALID_INPUT", "Permintaan terlalu besar.", 400);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new DomainError("INVALID_INPUT", "JSON tidak valid.", 400);
  }
  const input = parseInput(attendanceInputSchema, body);
  return json(await saveAttendance(path.classId, path.date, input, actor, requestId), requestId);
});
