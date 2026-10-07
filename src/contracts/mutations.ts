import { z } from "zod";
export const mutationResultSchema = z.object({
  saved: z.literal(true),
  id: z.union([z.string().min(1), z.number().int().positive()]),
  version: z.number().int().positive().optional(),
});
export type MutationResult = z.infer<typeof mutationResultSchema>;
