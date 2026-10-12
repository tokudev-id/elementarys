import type { LucideIcon } from "lucide-react";

export type KpiAccent = "teal" | "amber" | "sky" | "rose";

export function KpiCard({
  label,
  value,
  context,
  icon: Icon,
  accent = "teal",
  progress,
  tone,
}: {
  label: string;
  value: string | number;
  context?: string;
  icon?: LucideIcon;
  accent?: KpiAccent;
  /** 0–1, drawn as a thin bar under the value */
  progress?: number | null;
  tone?: "warning" | "H" | "S" | "I" | "A";
}) {
  return (
    <article className={`kpi-card kpi-card--${accent}`}>
      <div className="kpi-card__top">
        <span className="kpi-card__label">{label}</span>
        {Icon && (
          <span className="kpi-card__icon" aria-hidden="true">
            <Icon strokeWidth={1.75} />
          </span>
        )}
      </div>
      <strong className={`kpi-card__value ${tone ? `status-text--${tone}` : ""}`.trim()}>
        {value}
      </strong>
      {progress !== undefined && progress !== null && (
        <progress
          className="kpi-card__progress"
          value={Math.min(1, Math.max(0, progress))}
          max={1}
          aria-hidden="true"
        />
      )}
      {context && <span className="kpi-card__sub">{context}</span>}
    </article>
  );
}
