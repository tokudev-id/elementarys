"use client";

import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  error,
  required,
  id: suppliedId,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
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
      <input
        aria-label={props["aria-label"] ?? label}
        {...props}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && (
        <small id={`${id}-error`} className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
