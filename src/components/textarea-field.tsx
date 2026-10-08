"use client";

import {
  useState,
  useId,
  type TextareaHTMLAttributes,
  type FocusEvent,
  type ChangeEvent,
} from "react";
import { cn } from "@/lib/utils";

export function TextareaField({
  label,
  hint,
  error,
  required,
  maxLength,
  id: suppliedId,
  className,
  value,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  const generatedId = useId();
  const id = suppliedId ?? (props.name ? `field-${props.name}` : generatedId);
  const [isFocused, setIsFocused] = useState(false);
  const [currentVal, setCurrentVal] = useState(
    String(value ?? defaultValue ?? ""),
  );

  function handleFocus(e: FocusEvent<HTMLTextAreaElement>) {
    setIsFocused(true);
    onFocus?.(e);
  }

  function handleBlur(e: FocusEvent<HTMLTextAreaElement>) {
    setIsFocused(false);
    onBlur?.(e);
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setCurrentVal(e.target.value);
    onChange?.(e);
  }

  const length =
    value !== undefined ? String(value).length : currentVal.length;
  const describedBy =
    [
      hint && `${id}-hint`,
      error && `${id}-error`,
      maxLength && `${id}-counter`,
      props["aria-describedby"],
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div
      className={cn(
        "ui-field ui-field--textarea",
        error && "has-error",
        className,
      )}
    >
      <div className="ui-field__header">
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
        {maxLength && isFocused && (
          <span
            id={`${id}-counter`}
            className="field-counter"
            aria-live="polite"
          >
            {length}/{maxLength}
          </span>
        )}
      </div>
      <textarea
        aria-label={props["aria-label"] ?? label}
        {...props}
        id={id}
        value={value}
        defaultValue={defaultValue}
        maxLength={maxLength}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
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
