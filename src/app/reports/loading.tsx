import { StateBanner } from "@/components/state-banner";
export default function LoadingReports() {
  return (
    <main>
      <StateBanner state="loading">Sedang mengambil rekap bulanan.</StateBanner>
    </main>
  );
}
