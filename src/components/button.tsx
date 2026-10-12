import type { ComponentProps } from "react";
import { LoaderCircle } from "lucide-react";
import { Button as PrimitiveButton } from "./ui/button";

export type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "destructive" | "link";

export function Button({
  variant = "primary",
  size = "default",
  pending = false,
  children,
  className = "",
  disabled,
  ...props
}: ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: "default" | "icon";
  pending?: boolean;
}) {
  return (
    <PrimitiveButton
      {...props}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      variant={
        variant === "primary"
          ? "default"
          : variant === "secondary"
            ? "outline"
            : variant === "soft"
              ? "secondary"
              : variant
      }
      size={size}
      className={`ui-button ui-button--${variant} ${size !== "default" ? `ui-button--${size}` : ""} ${className}`}
    >
      {pending && <LoaderCircle className="loading-spinner" aria-hidden="true" />}
      {children}
    </PrimitiveButton>
  );
}

export function IconButton({
  label,
  variant = "ghost",
  ...props
}: Omit<ComponentProps<typeof Button>, "size" | "aria-label"> & { label: string }) {
  return <Button {...props} variant={variant} size="icon" aria-label={label} title={label} />;
}
