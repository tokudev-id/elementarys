import { handler, json } from "@/server/http";
import { requireActor, requireOrigin } from "@/server/auth/guards";
import { readJsonBody } from "@/server/request";
import { listStudents, createStudent } from "@/server/services/students";
export const GET = handler(async (request, requestId) => {
  await requireActor(request.headers);
  const query = new URL(request.url).searchParams;
  return json(
    await listStudents({
      classId: query.get("classId") ?? undefined,
      search: query.get("search") ?? undefined,
      includeArchived: query.get("includeArchived") === "true",
    }),
    requestId,
  );
});
export const POST = handler(async (request, requestId) => {
  requireOrigin(request);
  const actor = await requireActor(request.headers, { admin: true });
  return json(await createStudent(await readJsonBody(request), actor, requestId), requestId);
});
