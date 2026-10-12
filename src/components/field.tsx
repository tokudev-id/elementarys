"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  error,
  required,
  id: suppliedId,
  className,
  type,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  const generatedId = useId();
  const id = suppliedId ?? (props.name ? `field-${props.name}` : generatedId);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword ? (showPassword ? "text" : "password") : type;

  function handleTogglePassword() {
    setShowPassword((prev) => !prev);
  }

  const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`, props["aria-describedby"]]
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
      <div className={cn("ui-field__control", isPassword && "ui-field__control--password")}>
        <input
          aria-label={props["aria-label"] ?? label}
          {...props}
          type={effectiveType}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        {isPassword && (
          <button
            type="button"
            className="field-password-toggle"
            onClick={handleTogglePassword}
            aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="icon" size={18} aria-hidden="true" />
            ) : (
              <Eye className="icon" size={18} aria-hidden="true" />
            )}
          </button>
        )}
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
