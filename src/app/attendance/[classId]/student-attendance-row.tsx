import { StatusChoices } from "@/components/status-choices";
import type { RosterStudent } from "@/contracts/attendance-view";
import type { AttendanceStatus } from "@/domain/attendance";
import { statusLabels } from "./attendance-state";

type StudentAttendanceRowProps = {
  student: RosterStudent;
  value: AttendanceStatus | null;
  editable: boolean;
  disabled: boolean;
  onChange: (enrollmentId: string, status: AttendanceStatus) => void;
};

export function StudentAttendanceRow({
  student,
  value,
  editable,
  disabled,
  onChange,
}: StudentAttendanceRowProps) {
  const status = editable ? value : student.status;

  function changeStatus(nextStatus: AttendanceStatus) {
    onChange(student.enrollmentId, nextStatus);
  }

  return (
    <section className="student-attendance-row" data-testid="student-row">
      <h2>{student.fullName}</h2>
      <small>{student.studentCode}</small>
      <p>{status ? statusLabels[status] : "Belum dicatat"}</p>
      {editable && (
        <StatusChoices
          name={student.enrollmentId}
          legend={`Kehadiran ${student.fullName} (${student.studentCode})`}
          value={value ?? undefined}
          disabled={disabled}
          onChange={changeStatus}
        />
      )}
    </section>
  );
}
