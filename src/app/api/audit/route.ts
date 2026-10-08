import { handler, json } from "@/server/http";
import { requireActor } from "@/server/auth/guards";
import { auditQuery, getAuditPage } from "@/server/queries/audit";
export const GET = handler(async (request, requestId) => {
  const actor = await requireActor(request.headers, { admin: true });
  return json(await getAuditPage(auditQuery(new URL(request.url)), actor), requestId);
});
