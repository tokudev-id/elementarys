import { handler, json } from "@/server/http";
import { requireActor } from "@/server/auth/guards";
import { getMonthStudentAbsences } from "@/server/queries/calendar-absences";

export const GET = handler(async (request, requestId) => {
  await requireActor(request.headers);
  const url = new URL(request.url);
  const yearId = url.searchParams.get("yearId");
  const month = url.searchParams.get("month");

  if (!yearId || !month || !/^\d{4}-\d{2}$/.test(month)) {
    return json([], requestId);
  }

  const absences = await getMonthStudentAbsences(yearId, month);
  return json(absences, requestId);
});
