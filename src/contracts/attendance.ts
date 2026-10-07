import { z } from "zod";
import { isDateOnly } from "@/domain/calendar";
import { statuses } from "@/domain/attendance";
import { DomainError } from "@/domain/errors";
export const attendancePathSchema = z.object({
  classId: z.uuid(),
  date: z.string().refine(isDateOnly, "Tanggal tidak valid."),
});
export const attendanceQuerySchema = attendancePathSchema.extend({
  date: attendancePathSchema.shape.date.optional(),
});
export const attendanceInputSchema = z
  .object({
    expectedVersion: z.number().int().positive().nullable(),
    entries: z
      .array(
        z
          .object({
            enrollmentId: z.uuid().transform((value) => value.toLowerCase()),
            status: z.enum(statuses),
          })
          .strict(),
      )
      .max(1000),
    reason: z.string().trim().min(1).max(1000).nullable().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (new Set(data.entries.map((e) => e.enrollmentId)).size !== data.entries.length)
      ctx.addIssue({ code: "custom", path: ["entries"], message: "Siswa tidak boleh duplikat." });
  });
export type AttendanceInput = z.infer<typeof attendanceInputSchema>;
export function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new DomainError(
      "INVALID_INPUT",
      "Periksa isian permintaan.",
      400,
      z.flattenError(result.error).fieldErrors as Record<string, string[]>,
    );
  return result.data;
}
export const dashboardInputSchema = z.object({ date: z.string().refine(isDateOnly).optional() });
