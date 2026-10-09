export function MasterLoading() {
  return (
    <div className="main-content-loading" role="status" aria-label="Memuat daftar...">
      <div className="circular-spinner" aria-hidden="true" />
      <span className="sr-only">Memuat daftar...</span>
    </div>
  );
}
