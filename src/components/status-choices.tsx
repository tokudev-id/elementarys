"use client";
export const attendanceChoices = [{ value: "H", label: "Hadir" }, { value: "S", label: "Sakit" }, { value: "I", label: "Izin" }, { value: "A", label: "Alpa" }] as const;
export type AttendanceChoice = typeof attendanceChoices[number]["value"];
export function StatusChoices({ name, legend, value, onChange, disabled = false }: { name: string; legend: string; value?: AttendanceChoice; onChange: (value: AttendanceChoice) => void; disabled?: boolean }) {
  return <fieldset className="status-choices" disabled={disabled}><legend>{legend}</legend><div className="status-choices__options">{attendanceChoices.map(choice => <label key={choice.value}><input type="radio" name={name} value={choice.value} checked={value === choice.value} onChange={() => onChange(choice.value)} /><span><strong>{choice.value}</strong> {choice.label}</span></label>)}</div></fieldset>;
}
