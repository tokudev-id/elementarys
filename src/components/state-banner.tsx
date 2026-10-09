import type { ReactNode } from "react";
export type BannerState =
  | "loading"
  | "empty"
  | "error"
  | "conflict"
  | "session-expired"
  | "saved"
  | "info";
const titles: Record<BannerState, string> = {
  loading: "Sedang memuat",
  empty: "Belum ada data",
  error: "Belum berhasil",
  conflict: "Data telah berubah",
  "session-expired": "Sesi telah habis",
  saved: "Tersimpan",
  info: "Informasi",
};
export function StateBanner({
  state,
  title,
  children,
  action,
}: {
  state: BannerState;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const urgent = ["error", "conflict", "session-expired"].includes(state);
  return (
    <div
      className={`state-banner state-banner--${state}`}
      role={urgent ? "alert" : "status"}
      aria-atomic="true"
    >
      <strong>{title ?? titles[state]}</strong>
      {children && <div>{children}</div>}
      {action && <div className="state-banner__action">{action}</div>}
    </div>
  );
}
