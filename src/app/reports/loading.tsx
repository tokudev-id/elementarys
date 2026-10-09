export default function LoadingReports() {
  return (
    <div className="main-content-loading" role="status" aria-label="Sedang mengambil rekap...">
      <div className="circular-spinner" aria-hidden="true" />
      <span className="sr-only">Sedang mengambil rekap...</span>
    </div>
  );
}
