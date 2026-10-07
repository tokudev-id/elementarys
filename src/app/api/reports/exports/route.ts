import { handler, json } from "@/server/http";
import { requireActor, requireOrigin } from "@/server/auth/guards";
import { readJsonBody } from "@/server/request";
import { recordPrintExport } from "@/server/reports/print";

export const POST = handler(async (request, requestId) => {
  requireOrigin(request);
  const actor = await requireActor(request.headers);
  return json(await recordPrintExport(await readJsonBody(request), actor), requestId);
});
