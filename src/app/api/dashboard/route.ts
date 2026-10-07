import { handler, json } from "@/server/http";
import { requireActor } from "@/server/auth/guards";
import { dashboardInputSchema, parseInput } from "@/contracts/attendance";
import { getDashboard } from "@/server/queries/dashboard";
export const GET = handler(async (request, requestId) => {
  const actor = await requireActor(request.headers);
  const input = parseInput(dashboardInputSchema, {
    date: new URL(request.url).searchParams.get("date") ?? undefined,
  });
  return json(await getDashboard(actor, input.date), requestId);
});
