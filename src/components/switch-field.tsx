"use client";

import { useId } from "react";
import { Switch } from "./ui/switch";
import { cn } from "@/lib/utils";

export function SwitchField({
  label,
  hint,
  error,
  required,
  id: suppliedId,
  checked,
  onCheckedChange,
  name,
  disabled,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  name?: string;
  disabled?: boolean;
  className?: string;
}) {
  const generatedId = useId();
  const id = suppliedId ?? (name ? `field-${name}` : generatedId);

  return (
    <div
      className={cn("ui-field ui-field--switch", error && "has-error", className)}
    >
      <div className="switch-row">
        <Switch
          id={id}
          name={name}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          className="form-switch"
        />
        <label htmlFor={id} className="switch-label">
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
      </div>
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && (
        <small id={`${id}-error`} className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
