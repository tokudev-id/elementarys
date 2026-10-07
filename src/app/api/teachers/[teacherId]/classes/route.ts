import { handler, json } from "@/server/http";
import { requireActor, requireOrigin } from "@/server/auth/guards";
import { readJsonBody } from "@/server/request";
import { assignTeacherClasses } from "@/server/services/teachers";
export const PUT = handler(async (request, requestId) => {
  requireOrigin(request);
  const actor = await requireActor(request.headers, { admin: true });
  return json(
    await assignTeacherClasses(
      new URL(request.url).pathname.split("/")[3],
      await readJsonBody(request),
      actor,
      requestId,
    ),
    requestId,
  );
});
