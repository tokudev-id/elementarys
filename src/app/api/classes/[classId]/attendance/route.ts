import { handler, json } from "@/server/http";
import { requireActor } from "@/server/auth/guards";
import { attendancePathSchema, parseInput } from "@/contracts/attendance";
import { getAttendance } from "@/server/queries/attendance";
export const GET = handler(async (request, requestId) => {
  await requireActor(request.headers);
  const url = new URL(request.url);
  const path = parseInput(attendancePathSchema, {
    classId: url.pathname.split("/")[3],
    date: url.searchParams.get("date"),
  });
  return json(await getAttendance(path.classId, path.date), requestId);
});
