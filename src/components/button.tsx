import type { ButtonHTMLAttributes } from "react";

export function Button({
  variant = "primary",
  pending = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  pending?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`ui-button ui-button--${variant} ${className}`}
    >
      {children}
    </button>
  );
}
