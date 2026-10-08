import { Badge } from "./ui/badge";

export type StatusTone =
  "neutral" | "info" | "success" | "warning" | "danger" | "H" | "S" | "I" | "A";
export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: StatusTone;
}) {
  return (
    <Badge variant="outline" className={`status-badge status-badge--${tone}`}>
      {children}
    </Badge>
  );
}
