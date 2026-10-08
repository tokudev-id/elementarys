import type { ReactNode } from "react";

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="form-section" aria-label={title}>
      <header>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      <div className="form-section__fields">{children}</div>
    </section>
  );
}
