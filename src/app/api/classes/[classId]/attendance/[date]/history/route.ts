import { handler, json } from "@/server/http";
import { requireActor } from "@/server/auth/guards";
import { getAttendanceHistory } from "@/server/queries/attendance-history";
export const GET = handler(async (request, requestId) => {
  await requireActor(request.headers);
  const segments = new URL(request.url).pathname.split("/");
  return json(await getAttendanceHistory(segments[3], segments[5]), requestId);
});
