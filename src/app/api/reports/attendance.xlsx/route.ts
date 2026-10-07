import { handler } from "@/server/http";
import { requireActor } from "@/server/auth/guards";
import { reportInputSchema } from "@/contracts/reports";
import { parseInput } from "@/contracts/attendance";
import { exportAttendanceWorkbook } from "@/server/reports/workbook";

export const GET = handler(async (request, requestId) => {
  const actor = await requireActor(request.headers);
  const input = parseInput(
    reportInputSchema,
    Object.fromEntries(new URL(request.url).searchParams),
  );
  const result = await exportAttendanceWorkbook(input, actor);
  return new Response(result.content, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="rekap-${input.month}.xlsx"`,
      "Cache-Control": "private, no-store",
      "X-Request-Id": requestId,
    },
  });
});
