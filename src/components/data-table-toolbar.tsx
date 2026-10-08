import type { ReactNode } from "react";

export function DataTableToolbar({ children }: { children: ReactNode }) {
  return <div className="data-toolbar">{children}</div>;
}
