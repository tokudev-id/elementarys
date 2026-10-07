import { z } from "zod";
import { reportInputSchema } from "./reports";

export const printSnapshotSchema = z
  .object({
    input: reportInputSchema,
    sessionVersions: z.record(z.uuid(), z.number().int().positive()),
    generatedAt: z.iso.datetime(),
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  })
  .strict();
export type PrintSnapshot = z.infer<typeof printSnapshotSchema>;
export const printReceiptSchema = z.object({ exportId: z.uuid() });
