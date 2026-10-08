import { handler, json } from "@/server/http";
import { requireActor, requireOrigin } from "@/server/auth/guards";
import { readJsonBody } from "@/server/request";
import { listStudents, createStudent } from "@/server/services/students";
import { listQuery } from "@/contracts/lists";
export const GET = handler(async (request, requestId) => {
  await requireActor(request.headers);
  const query = new URL(request.url).searchParams;
  return json(
    await listStudents({
      ...listQuery(query, ["page", "pageSize", "q", "classId", "status", "sort"]),
      ...(query.has("search") && !query.has("q") ? { q: query.get("search") } : {}),
      ...(query.get("includeArchived") === "true" && !query.has("status") ? { status: "all" } : {}),
    }),
    requestId,
  );
});
export const POST = handler(async (request, requestId) => {
  requireOrigin(request);
  const actor = await requireActor(request.headers, { admin: true });
  return json(await createStudent(await readJsonBody(request), actor, requestId), requestId);
});
