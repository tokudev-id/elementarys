"use client";

import {
  useId,
  type SelectHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export function SelectField({
  label,
  hint,
  error,
  required,
  id: suppliedId,
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const generatedId = useId();
  const id = suppliedId ?? (props.name ? `field-${props.name}` : generatedId);
  const describedBy =
    [
      hint && `${id}-hint`,
      error && `${id}-error`,
      props["aria-describedby"],
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={cn("ui-field", error && "has-error", className)}>
      <label htmlFor={id}>
        {label}
        {required && (
          <>
            <span className="field-required" aria-hidden="true">
              {" "}
              *
            </span>
            <span className="sr-only"> wajib</span>
          </>
        )}
      </label>
      <select
        aria-label={props["aria-label"] ?? label}
        {...props}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      >
        {children}
      </select>
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && (
        <small id={`${id}-error`} className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
