import { z } from "zod";
import { isDateOnly } from "@/domain/calendar";
export const auditEntities = [
  "school_config",
  "academic_year",
  "class",
  "student",
  "teacher",
  "user",
  "attendance_session",
  "report_export",
] as const;
const date = z.string().refine(isDateOnly, "Tanggal tidak valid.");
export const auditFilterSchema = z
  .object({
    entityType: z.enum(auditEntities).optional(),
    entityId: z.string().trim().min(1).max(128).optional(),
    actorId: z.string().trim().min(1).max(128).optional(),
    from: date.optional(),
    to: date.optional(),
    cursor: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .max(512)
      .optional(),
    limit: z.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine(
    (value) => !value.from || !value.to || value.from <= value.to,
    "Tanggal akhir harus setelah atau sama dengan tanggal awal.",
  );
export const auditCursorSchema = z.object({ at: z.iso.datetime(), id: z.uuid() }).strict();
export type AuditFilter = z.input<typeof auditFilterSchema>;
export type AuditEvent = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  occurredAt: string;
  actor: { id: string; name: string };
  requestId: string | null;
  reason: string | null;
  before: unknown;
  after: unknown;
};
export type AuditPage = { events: AuditEvent[]; nextCursor: string | null; timezone: string };
