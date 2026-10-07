import { handler, json } from "@/server/http";
import { requireActor, requireOrigin } from "@/server/auth/guards";
import { readJsonBody } from "@/server/request";
import { listClasses, createClass } from "@/server/services/school-master";
export const GET = handler(async (request, requestId) => {
  await requireActor(request.headers);
  return json(
    await listClasses(undefined, new URL(request.url).searchParams.get("yearId") ?? undefined),
    requestId,
  );
});
export const POST = handler(async (request, requestId) => {
  requireOrigin(request);
  const actor = await requireActor(request.headers, { admin: true });
  return json(await createClass(await readJsonBody(request), actor, requestId), requestId);
});
