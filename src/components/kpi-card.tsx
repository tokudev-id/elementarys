import { Card, CardContent } from "./ui/card";

export function KpiCard({
  label,
  value,
  context,
  tone,
}: {
  label: string;
  value: string | number;
  context?: string;
  tone?: "warning" | "H" | "S" | "I" | "A";
}) {
  return (
    <Card className="kpi-card">
      <CardContent>
        <p>{label}</p>
        <strong className={tone ? `status-text--${tone}` : undefined}>{value}</strong>
        {context && <small>{context}</small>}
      </CardContent>
    </Card>
  );
}
