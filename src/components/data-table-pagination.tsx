import Link from "next/link";

export function DataTablePagination({
  total,
  page,
  pageSize,
  pathname,
  query = {},
}: {
  total: number;
  page: number;
  pageSize: number;
  pathname: string;
  query?: Record<string, string>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  function href(target: number) {
    return `${pathname}?${new URLSearchParams({ ...query, page: String(target), pageSize: String(pageSize) })}`;
  }
  return (
    <nav className="data-pagination" aria-label="Halaman daftar">
      <span>
        Menampilkan {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} dari{" "}
        {total}
      </span>
      <div>
        {page > 1 ? (
          <Link href={href(page - 1)}>Sebelumnya</Link>
        ) : (
          <span aria-disabled="true">Sebelumnya</span>
        )}
        <span>
          Hal {page} dari {pages}
        </span>
        {page < pages ? (
          <Link href={href(page + 1)}>Berikutnya</Link>
        ) : (
          <span aria-disabled="true">Berikutnya</span>
        )}
      </div>
    </nav>
  );
}
