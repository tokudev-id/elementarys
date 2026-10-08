import { z } from "zod";
import type { StudentView } from "./students";
import type { TeacherView } from "./teachers";
import type { ClassView } from "./school-master";

const pageFields = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) => [10, 25, 50].includes(value), "Pilih 10, 25 atau 50 per halaman.")
    .default(25),
  q: z.string().trim().max(200).default(""),
};
export const studentListSchema = z
  .object({
    ...pageFields,
    classId: z.uuid().optional(),
    status: z.enum(["active", "archived", "all"]).default("active"),
    sort: z.enum(["name", "code", "class"]).default("name"),
  })
  .strict();
export const teacherListSchema = z
  .object({
    ...pageFields,
    status: z.enum(["active", "inactive", "unlinked", "password_change", "all"]).default("all"),
    role: z.enum(["admin", "teacher"]).optional(),
    sort: z.enum(["name", "email"]).default("name"),
  })
  .strict();
export const classListSchema = z
  .object({
    ...pageFields,
    yearId: z.uuid().optional(),
    grade: z.coerce.number().int().min(1).max(6).optional(),
    status: z.enum(["active", "archived", "all"]).default("all"),
    sort: z.enum(["grade", "name", "year"]).default("grade"),
  })
  .strict();
export type PageResult<T> = { items: T[]; total: number; page: number; pageSize: number };
export type StudentListItem = StudentView & { activeClass: { id: string; name: string } | null };
export type TeacherListItem = TeacherView;
export type ClassListItem = ClassView & {
  yearLabel: string;
  studentCount: number;
  primaryTeachers: { id: string; name: string }[];
};

export function listQuery(params: URLSearchParams, keys: string[]) {
  return Object.fromEntries(
    keys.flatMap((key) => {
      const value = params.get(key);
      return value ? [[key, value]] : [];
    }),
  );
}
