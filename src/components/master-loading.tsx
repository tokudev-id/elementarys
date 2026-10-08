import { Skeleton } from "./ui/skeleton";

export function MasterLoading() {
  return (
    <div className="master-loading" role="status" aria-label="Memuat daftar">
      <p>Memuat daftar…</p>
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="master-loading-row" />
      ))}
    </div>
  );
}
