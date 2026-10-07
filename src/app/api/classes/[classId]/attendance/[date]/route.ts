import { handler, json } from "@/server/http";
import { requireActor, requireOrigin } from "@/server/auth/guards";
import { attendanceInputSchema, attendancePathSchema, parseInput } from "@/contracts/attendance";
import { readJsonBody } from "@/server/request";
import { saveAttendance } from "@/server/services/attendance/save";
export const PUT = handler(async (request, requestId) => {
  requireOrigin(request);
  const actor = await requireActor(request.headers);
  const segments = new URL(request.url).pathname.split("/");
  const path = parseInput(attendancePathSchema, { classId: segments[3], date: segments[5] });
  const input = parseInput(attendanceInputSchema, await readJsonBody(request));
  return json(await saveAttendance(path.classId, path.date, input, actor, requestId), requestId);
});
