CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
CREATE SEQUENCE student_code_seq;
--> statement-breakpoint
ALTER TABLE academic_years ADD CONSTRAINT year_no_overlap EXCLUDE USING gist (daterange(starts_on, ends_on_exclusive, '[)') WITH &&);
--> statement-breakpoint
ALTER TABLE enrollments ADD CONSTRAINT enrollment_no_overlap EXCLUDE USING gist (student_id WITH =, daterange(starts_on, ends_on_exclusive, '[)') WITH &&);
--> statement-breakpoint
CREATE FUNCTION validate_attendance_record() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s attendance_sessions%ROWTYPE; e enrollments%ROWTYPE;
BEGIN
  SELECT * INTO s FROM attendance_sessions WHERE id=NEW.session_id;
  SELECT * INTO e FROM enrollments WHERE id=NEW.enrollment_id;
  IF s.id IS NULL OR e.id IS NULL OR e.student_id<>NEW.student_id OR e.class_id<>s.class_id
     OR s.date<>NEW.date OR NEW.date<e.starts_on OR NEW.date>=e.ends_on_exclusive OR s.state<>'submitted' THEN
    RAISE EXCEPTION 'attendance record relationship mismatch' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER attendance_record_integrity BEFORE INSERT OR UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION validate_attendance_record();
--> statement-breakpoint
CREATE FUNCTION prevent_history_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'history is append-only' USING ERRCODE='23514'; END $$;
--> statement-breakpoint
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION prevent_history_update();
--> statement-breakpoint
CREATE TRIGGER exports_append_only BEFORE UPDATE OR DELETE ON report_exports FOR EACH ROW EXECUTE FUNCTION prevent_history_update();
