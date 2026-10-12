import { Skeleton } from "./ui/skeleton";

type Variant = "list" | "dashboard" | "report" | "calendar" | "form" | "detail";

function HeaderSkeleton() {
  return (
    <div className="skeleton-header">
      <Skeleton className="skeleton-icon" />
      <div className="skeleton-stack">
        <Skeleton className="skeleton-line skeleton-line--title" />
        <Skeleton className="skeleton-line skeleton-line--wide" />
      </div>
    </div>
  );
}

function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="data-card skeleton-card">
      <div className="data-card__header">
        <Skeleton className="skeleton-line skeleton-line--title" />
      </div>
      <div className="data-card__toolbar">
        <Skeleton className="skeleton-control" />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton-row" key={index}>
          <Skeleton className="skeleton-avatar" />
          <Skeleton className="skeleton-line skeleton-line--wide" />
          <Skeleton className="skeleton-line skeleton-line--short" />
          <Skeleton className="skeleton-pill" />
        </div>
      ))}
    </div>
  );
}

function CardSkeleton({ className = "", lines = 4 }: { className?: string; lines?: number }) {
  return (
    <div className={`data-card skeleton-card ${className}`.trim()}>
      <div className="data-card__header">
        <Skeleton className="skeleton-line skeleton-line--title" />
      </div>
      <div className="skeleton-body">
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton className="skeleton-line skeleton-line--full" key={index} />
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton({
  variant = "list",
  label = "Memuat halaman",
}: {
  variant?: Variant;
  label?: string;
}) {
  return (
    <div className="page-skeleton" role="status" aria-label={label}>
      <span className="sr-only">{label}…</span>
      <HeaderSkeleton />
      {variant === "dashboard" && (
        <>
          <div className="dashboard-kpi-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="kpi-card skeleton-card" key={index}>
                <Skeleton className="skeleton-line skeleton-line--short" />
                <Skeleton className="skeleton-value" />
                <Skeleton className="skeleton-line skeleton-line--wide" />
              </div>
            ))}
          </div>
          <div className="dashboard-bento">
            <CardSkeleton lines={6} />
            <CardSkeleton lines={4} />
          </div>
        </>
      )}
      {variant === "list" && <TableSkeleton />}
      {variant === "report" && (
        <>
          <CardSkeleton lines={2} />
          <TableSkeleton rows={8} />
        </>
      )}
      {variant === "calendar" && (
        <div className="calendar-split-layout">
          <div className="data-card skeleton-card">
            <div className="data-card__header">
              <Skeleton className="skeleton-line skeleton-line--title" />
            </div>
            <div className="skeleton-calendar">
              {Array.from({ length: 35 }, (_, index) => (
                <Skeleton className="skeleton-day" key={index} />
              ))}
            </div>
          </div>
          <CardSkeleton lines={5} />
        </div>
      )}
      {variant === "form" && (
        <div className="form-page">
          <CardSkeleton lines={5} />
        </div>
      )}
      {variant === "detail" && (
        <>
          <CardSkeleton lines={3} />
          <TableSkeleton rows={4} />
        </>
      )}
    </div>
  );
}
