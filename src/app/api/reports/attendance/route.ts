import { handler, json } from "@/server/http";
import { requireActor } from "@/server/auth/guards";
import { parseInput } from "@/contracts/attendance";
import { reportInputSchema } from "@/contracts/reports";
import { buildMonthlyAttendanceReport } from "@/server/reports/monthly";

export const GET = handler(async (request, requestId) => {
  await requireActor(request.headers);
  const input = parseInput(
    reportInputSchema,
    Object.fromEntries(new URL(request.url).searchParams),
  );
  return json(await buildMonthlyAttendanceReport(input), requestId);
});
