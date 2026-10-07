import type { SetupState } from "@/contracts/settings";
export function SetupChecklist({ state }: { state: SetupState }) {
  const items = [
    { label: "Identitas sekolah", ready: state.identity },
    { label: "Tahun ajaran aktif", ready: state.currentYear },
    { label: "Hari belajar", ready: state.weekdays },
    { label: "Kelas", ready: state.classes },
  ];
  return (
    <dl className="setup-checklist">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.ready ? "Lengkap" : "Perlu dilengkapi"}</dd>
        </div>
      ))}
    </dl>
  );
}
