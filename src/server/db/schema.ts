import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  jsonb,
  primaryKey,
  unique,
  check,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
export * from "./auth-schema";

const id = () => uuid("id").primaryKey().defaultRandom();
const version = () => integer("version").notNull().default(1);
const time = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });

export const schoolConfig = pgTable(
  "school_config",
  {
    id: integer("id").primaryKey().default(1),
    name: text("name").notNull(),
    location: text("location"),
    timezone: text("timezone").notNull().default("Asia/Kuala_Lumpur"),
    version: version(),
    configuredAt: time("configured_at"),
    updatedAt: time("updated_at").notNull().defaultNow(),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "restrict" }),
  },
  (t) => [
    check("config_singleton", sql`${t.id} = 1`),
    check("config_name", sql`length(trim(${t.name})) > 0`),
  ],
);

export const academicYears = pgTable(
  "academic_years",
  {
    id: id(),
    label: text("label").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOnExclusive: date("ends_on_exclusive").notNull(),
    isCurrent: boolean("is_current").notNull().default(false),
    archivedAt: time("archived_at"),
    version: version(),
  },
  (t) => [
    check("year_range", sql`${t.endsOnExclusive} > ${t.startsOn}`),
    check("year_label", sql`length(trim(${t.label})) > 0`),
    uniqueIndex("one_current_year")
      .on(t.isCurrent)
      .where(sql`${t.isCurrent} = true`),
  ],
);

export const schoolWeekdays = pgTable(
  "school_weekdays",
  {
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "restrict" }),
    weekday: integer("weekday").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.academicYearId, t.weekday] }),
    check("weekday_range", sql`${t.weekday} between 0 and 6`),
  ],
);

export const schoolDayOverrides = pgTable(
  "school_day_overrides",
  {
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "restrict" }),
    date: date("date").notNull(),
    isSchoolDay: boolean("is_school_day").notNull(),
    reason: text("reason").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.academicYearId, t.date] }),
    check("override_reason", sql`length(trim(${t.reason})) > 0`),
  ],
);

export const classes = pgTable(
  "classes",
  {
    id: id(),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "restrict" }),
    grade: integer("grade").notNull(),
    name: text("name").notNull(),
    archivedAt: time("archived_at"),
    version: version(),
  },
  (t) => [
    unique("class_name_in_year").on(t.academicYearId, t.name),
    check("class_grade", sql`${t.grade} between 1 and 6`),
    check("class_name", sql`length(trim(${t.name})) > 0`),
  ],
);

export const students = pgTable(
  "students",
  {
    id: id(),
    studentCode: text("student_code").notNull().unique(),
    fullName: text("full_name").notNull(),
    nis: text("nis"),
    nisn: text("nisn"),
    archivedAt: time("archived_at"),
    version: version(),
  },
  (t) => [
    check("student_name", sql`length(trim(${t.fullName})) > 0`),
    check("student_code", sql`length(trim(${t.studentCode})) > 0`),
  ],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: id(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "restrict" }),
    startsOn: date("starts_on").notNull(),
    endsOnExclusive: date("ends_on_exclusive").notNull(),
    exitReason: text("exit_reason"),
  },
  (t) => [
    check("enrollment_range", sql`${t.endsOnExclusive} > ${t.startsOn}`),
    index("enrollment_student_start").on(t.studentId, t.startsOn),
    index("enrollment_class_start").on(t.classId, t.startsOn),
  ],
);

export const teachers = pgTable(
  "teachers",
  {
    id: id(),
    userId: text("user_id")
      .unique()
      .references(() => user.id, { onDelete: "restrict" }),
    fullName: text("full_name").notNull(),
    active: boolean("active").notNull().default(true),
    version: version(),
  },
  (t) => [check("teacher_name", sql`length(trim(${t.fullName})) > 0`)],
);

export const teacherClasses = pgTable(
  "teacher_classes",
  {
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "restrict" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.teacherId, t.classId] })],
);

export const attendanceSessions = pgTable(
  "attendance_sessions",
  {
    id: id(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "restrict" }),
    date: date("date").notNull(),
    state: text("state").notNull(),
    version: version(),
    submittedBy: text("submitted_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    submittedAt: time("submitted_at").notNull(),
    voidReason: text("void_reason"),
  },
  (t) => [
    unique("session_class_date").on(t.classId, t.date),
    check("session_state", sql`${t.state} in ('submitted','voided')`),
  ],
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: id(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => attendanceSessions.id, { onDelete: "restrict" }),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "restrict" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    date: date("date").notNull(),
    status: text("status").notNull(),
  },
  (t) => [
    unique("record_session_enrollment").on(t.sessionId, t.enrollmentId),
    unique("record_student_date").on(t.studentId, t.date),
    check("record_status", sql`${t.status} in ('H','S','I','A')`),
  ],
);

export const reportExports = pgTable(
  "report_exports",
  {
    id: id(),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "restrict" }),
    month: date("month").notNull(),
    classId: uuid("class_id").references(() => classes.id, { onDelete: "restrict" }),
    format: text("format").notNull(),
    sessionVersions: jsonb("session_versions").notNull().$type<Record<string, number>>(),
    exportedBy: text("exported_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    exportedAt: time("exported_at").notNull().defaultNow(),
  },
  (t) => [
    check("export_format", sql`${t.format} in ('xlsx','print')`),
    check("export_month", sql`extract(day from ${t.month}) = 1`),
    index("export_year_month_time").on(t.academicYearId, t.month, t.exportedAt),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: id(),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    occurredAt: time("occurred_at").notNull().defaultNow(),
    requestId: uuid("request_id").notNull(),
    reason: text("reason"),
    changesJson: jsonb("changes_json").notNull(),
  },
  (t) => [index("audit_entity_time").on(t.entityType, t.entityId, t.occurredAt)],
);
