import { handler, json } from "@/server/http";
import { requireActor, requireOrigin } from "@/server/auth/guards";
import { readJsonBody } from "@/server/request";
import { voidAttendance } from "@/server/services/attendance/void";
export const POST = handler(async (request, requestId) => {
  requireOrigin(request);
  const actor = await requireActor(request.headers, { admin: true });
  const segments = new URL(request.url).pathname.split("/");
  return json(
    await voidAttendance(segments[3], segments[5], await readJsonBody(request), actor, requestId),
    requestId,
  );
});
