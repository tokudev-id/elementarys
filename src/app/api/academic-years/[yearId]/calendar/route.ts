import { handler, json } from "@/server/http";
import { requireActor, requireOrigin } from "@/server/auth/guards";
import { readJsonBody } from "@/server/request";
import { getCalendar, updateCalendar } from "@/server/services/school-master";
export const GET = handler(async (request, requestId) => {
  await requireActor(request.headers);
  const url = new URL(request.url);
  return json(
    await getCalendar(url.pathname.split("/")[3], url.searchParams.get("month") ?? ""),
    requestId,
  );
});
export const PUT = handler(async (request, requestId) => {
  requireOrigin(request);
  const actor = await requireActor(request.headers, { admin: true });
  return json(
    await updateCalendar(
      new URL(request.url).pathname.split("/")[3],
      await readJsonBody(request),
      actor,
      requestId,
    ),
    requestId,
  );
});
