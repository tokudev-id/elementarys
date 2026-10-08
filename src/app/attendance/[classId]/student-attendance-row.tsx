import { StatusChoices } from "@/components/status-choices";
import type { RosterStudent } from "@/contracts/attendance-view";
import type { AttendanceStatus } from "@/domain/attendance";
import { statusLabels } from "./attendance-state";
import { StatusBadge } from "@/components/status-badge";

type StudentAttendanceRowProps = {
  student: RosterStudent;
  value: AttendanceStatus | null;
  editable: boolean;
  disabled: boolean;
  onChange: (enrollmentId: string, status: AttendanceStatus) => void;
  number: number;
};

export function StudentAttendanceRow({
  student,
  value,
  editable,
  disabled,
  onChange,
  number,
}: StudentAttendanceRowProps) {
  const status = editable ? (value ?? "H") : student.status;

  function changeStatus(nextStatus: AttendanceStatus) {
    onChange(student.enrollmentId, nextStatus);
  }

  return (
    <section
      className="student-attendance-row roster-row"
      data-testid="student-row"
      data-enrollment-id={student.enrollmentId}
      data-status={status ?? "pending"}
      tabIndex={0}
    >
      <span className="roster-number" aria-hidden="true">
        {number}
      </span>
      <div className="roster-identity">
        <h2>{student.fullName}</h2>
        <small>{student.studentCode}</small>
      </div>
      {editable && (
        <StatusChoices
          name={student.enrollmentId}
          legend={`Kehadiran ${student.fullName} (${student.studentCode})`}
          value={value ?? "H"}
          disabled={disabled}
          onChange={changeStatus}
        />
      )}
      {!editable && (
        <StatusBadge tone={status ?? "neutral"}>
          {status ? `${status} ${statusLabels[status]}` : "Belum dicatat"}
        </StatusBadge>
      )}
    </section>
  );
}
