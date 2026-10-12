import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// full-page state for 404 and render errors; sits inside the shell when signed in
export function StatusPage({
  icon: Icon,
  code,
  title,
  description,
  actions,
  tone = "neutral",
}: {
  icon: LucideIcon;
  code?: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <section className={`status-page status-page--${tone}`} aria-labelledby="status-page-title">
      <div className="status-page__card">
        <span className="status-page__icon" aria-hidden="true">
          <Icon strokeWidth={1.75} />
        </span>
        {code && <p className="status-page__code">{code}</p>}
        <h1 id="status-page-title">{title}</h1>
        <div className="status-page__description">{description}</div>
        {actions && <div className="status-page__actions">{actions}</div>}
      </div>
    </section>
  );
}
