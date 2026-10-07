import { handler, json } from "@/server/http";
import { requireActor, requireOrigin } from "@/server/auth/guards";
import { readJsonBody } from "@/server/request";
import { updateAccountAccess } from "@/server/services/teachers";
export const PATCH = handler(async (request, requestId) => {
  requireOrigin(request);
  const actor = await requireActor(request.headers, { admin: true });
  return json(
    await updateAccountAccess(
      decodeURIComponent(new URL(request.url).pathname.split("/")[3]),
      await readJsonBody(request),
      actor,
      requestId,
    ),
    requestId,
  );
});
