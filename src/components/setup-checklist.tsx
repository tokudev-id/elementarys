import type { SetupState } from "@/contracts/settings";
import {
  DataCard,
  DataCardHeader,
  DataCardContent,
} from "@/components/data-card";
import { StatusBadge } from "@/components/status-badge";

export function SetupChecklist({ state }: { state: SetupState }) {
  const items = [
    { label: "Identitas sekolah", ready: state.identity },
    { label: "Tahun ajaran aktif", ready: state.currentYear },
    { label: "Hari belajar", ready: state.weekdays },
    { label: "Kelas", ready: state.classes },
  ];

  const readyCount = items.filter((i) => i.ready).length;

  return (
    <DataCard className="setup-checklist-card">
      <DataCardHeader>
        <div className="data-card__title-group">
          <h2 className="data-card__title">
            Checklist kesiapan sekolah
            <span className="data-card__count"> · {readyCount}/{items.length}</span>
          </h2>
        </div>
      </DataCardHeader>
      <DataCardContent>
        <dl className="setup-checklist">
          {items.map((item) => (
            <div key={item.label} className="setup-checklist__row">
              <dt>{item.label}</dt>
              <dd>
                <StatusBadge tone={item.ready ? "success" : "neutral"}>
                  {item.ready ? "Lengkap" : "Perlu dilengkapi"}
                </StatusBadge>
              </dd>
            </div>
          ))}
        </dl>
      </DataCardContent>
    </DataCard>
  );
}
