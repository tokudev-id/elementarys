import type { ReactNode } from "react";
import { DataCard, DataCardHeader, DataCardContent, DataCardFooter } from "./data-card";

export function FormSection({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <DataCard className="form-card" aria-label={title}>
      <DataCardHeader title={title} description={description} />
      <DataCardContent className="data-card__content--padded">
        <div className="form-section__fields">{children}</div>
      </DataCardContent>
      {actions && <DataCardFooter>{actions}</DataCardFooter>}
    </DataCard>
  );
}
