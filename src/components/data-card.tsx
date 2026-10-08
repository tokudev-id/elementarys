import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DataCard({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("data-card", className)} data-slot="data-card">
      {children}
    </section>
  );
}

export function DataCardHeader({
  title,
  count,
  actions,
  children,
  className,
}: {
  title?: string;
  count?: number;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("data-card__header", className)} data-slot="data-card-header">
      {children ? (
        children
      ) : (
        <>
          <div className="data-card__title-group">
            <h2 className="data-card__title">
              {title}
              {count !== undefined && <span className="data-card__count"> · {count}</span>}
            </h2>
          </div>
          {actions && <div className="data-card__actions">{actions}</div>}
        </>
      )}
    </header>
  );
}

export function DataCardToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("data-card__toolbar", className)} data-slot="data-card-toolbar">
      {children}
    </div>
  );
}

export function DataCardContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("data-card__content", className)} data-slot="data-card-content">
      {children}
    </div>
  );
}

export function DataCardFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <footer className={cn("data-card__footer", className)} data-slot="data-card-footer">
      {children}
    </footer>
  );
}
