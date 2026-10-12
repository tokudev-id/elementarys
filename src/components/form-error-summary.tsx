"use client";

import type { MouseEvent } from "react";
import { AlertCircle } from "lucide-react";
import type { FormErrorItem } from "./use-zod-form";

export function FormErrorSummary({
  errors,
  className,
}: {
  errors: FormErrorItem[];
  className?: string;
}) {
  if (!errors || errors.length < 3) return null;

  function handleClick(field: string) {
    return (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const el = document.querySelector<HTMLElement>(`[name="${field}"], #${field}`);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    };
  }

  return (
    <div
      className={`form-error-summary ${className ?? ""}`}
      role="alert"
      aria-labelledby="form-error-summary-title"
    >
      <div className="form-error-summary__header">
        <AlertCircle size={18} aria-hidden="true" />
        <h3 id="form-error-summary-title" className="form-error-summary__title">
          Periksa {errors.length} isian berikut:
        </h3>
      </div>
      <ul className="form-error-summary__list">
        {errors.map(({ field, label, message }) => (
          <li key={field}>
            <a href={`#${field}`} onClick={handleClick(field)}>
              {label ? `${label}: ` : ""}
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
