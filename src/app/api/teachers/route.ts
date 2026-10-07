import { handler, json } from "@/server/http";
import { requireActor, requireOrigin } from "@/server/auth/guards";
import { readJsonBody } from "@/server/request";
import { listTeachers, createTeacher } from "@/server/services/teachers";
export const GET = handler(async (request, requestId) => {
  const actor = await requireActor(request.headers);
  return json(await listTeachers(actor), requestId);
});
export const POST = handler(async (request, requestId) => {
  requireOrigin(request);
  const actor = await requireActor(request.headers, { admin: true });
  return json(await createTeacher(await readJsonBody(request), actor, requestId), requestId);
});
