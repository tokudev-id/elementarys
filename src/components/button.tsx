import type { ComponentProps } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Button as PrimitiveButton } from "./ui/button";

export type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "destructive" | "link";
export type ButtonSize = "default" | "sm" | "icon";

function buttonClass(variant: ButtonVariant, size: ButtonSize, className = "") {
  return `ui-button ui-button--${variant} ${size !== "default" ? `ui-button--${size}` : ""} ${className}`.trim();
}

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
  size?: ButtonSize;
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
      className={buttonClass(variant, size, className)}
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

// a navigation link that looks like a button; same variants as Button
export function ButtonLink({
  variant = "secondary",
  size = "default",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link {...props} className={buttonClass(variant, size, `button-link ${className}`)} />;
}
