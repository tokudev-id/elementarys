import type { ComponentProps } from "react";
import { LoaderCircle } from "lucide-react";
import { Button as PrimitiveButton } from "./ui/button";

export function Button({
  variant = "primary",
  pending = false,
  children,
  className = "",
  disabled,
  ...props
}: ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "link";
  pending?: boolean;
}) {
  return (
    <PrimitiveButton
      {...props}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      variant={variant === "primary" ? "default" : variant === "secondary" ? "outline" : variant}
      className={`ui-button ui-button--${variant} ${className}`}
    >
      {pending && <LoaderCircle className="loading-spinner" aria-hidden="true" />}
      {children}
    </PrimitiveButton>
  );
}
