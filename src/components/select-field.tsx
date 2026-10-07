"use client";
import { useId, type SelectHTMLAttributes, type ReactNode } from "react";
export function SelectField({
  label,
  children,
  id: suppliedId,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return (
    <div className="ui-field">
      <label htmlFor={id}>{label}</label>
      <select {...props} id={id}>
        {children}
      </select>
    </div>
  );
}
