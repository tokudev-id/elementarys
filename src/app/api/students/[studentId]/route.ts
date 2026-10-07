import { handler, json } from "@/server/http";
import { requireActor, requireOrigin } from "@/server/auth/guards";
import { readJsonBody } from "@/server/request";
import { getStudent, updateStudent } from "@/server/services/students";
export const GET = handler(async (request, requestId) => {
  await requireActor(request.headers);
  return json(await getStudent(new URL(request.url).pathname.split("/")[3]), requestId);
});
export const PATCH = handler(async (request, requestId) => {
  requireOrigin(request);
  const actor = await requireActor(request.headers, { admin: true });
  return json(
    await updateStudent(
      new URL(request.url).pathname.split("/")[3],
      await readJsonBody(request),
      actor,
      requestId,
    ),
    requestId,
  );
});
