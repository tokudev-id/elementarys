"use client";
import type { ChangeEvent } from "react";
export const attendanceChoices = [
  { value: "H", label: "Hadir" },
  { value: "S", label: "Sakit" },
  { value: "I", label: "Izin" },
  { value: "A", label: "Alpa" },
] as const;
export type AttendanceChoice = (typeof attendanceChoices)[number]["value"];
export function StatusChoices({
  name,
  legend,
  value,
  onChange,
  disabled = false,
}: {
  name: string;
  legend: string;
  value?: AttendanceChoice;
  onChange: (value: AttendanceChoice) => void;
  disabled?: boolean;
}) {
  function changeStatus(event: ChangeEvent<HTMLInputElement>) {
    const selected = attendanceChoices.find((choice) => choice.value === event.currentTarget.value);
    if (selected) onChange(selected.value);
  }

  return (
    <fieldset className="status-choices" disabled={disabled}>
      <legend>{legend}</legend>
      <div className="status-choices__options">
        {attendanceChoices.map((choice) => (
          <label key={choice.value}>
            <input
              type="radio"
              name={name}
              value={choice.value}
              checked={value === choice.value}
              onChange={changeStatus}
            />
            <span>
              <strong>{choice.value}</strong> {choice.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
