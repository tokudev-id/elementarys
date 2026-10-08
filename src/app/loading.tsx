import { PageContainer } from "@/components/app-shell";
import { StateBanner } from "@/components/state-banner";
export default function Loading() {
  return (
    <PageContainer>
      <StateBanner state="loading">Memuat halaman sekolah.</StateBanner>
    </PageContainer>
  );
}
