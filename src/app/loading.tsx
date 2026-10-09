export default function Loading() {
  return (
    <div className="main-content-loading" role="status" aria-label="Memuat...">
      <div className="circular-spinner" aria-hidden="true" />
      <span className="sr-only">Memuat...</span>
    </div>
  );
}
