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
  const numbers = Array.from({ length: pages }, (_, index) => index + 1).filter(
    (number) => number === 1 || number === pages || Math.abs(number - page) <= 1,
  );
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
        <span className="pagination-summary">
          Hal {page} dari {pages}
        </span>
        <div className="pagination-numbers">
          {numbers.map((number, index) => (
            <span key={number}>
              {index > 0 && number - numbers[index - 1] > 1 && <span aria-hidden="true">…</span>}
              <Link
                href={href(number)}
                aria-label={`Halaman ${number}`}
                aria-current={number === page ? "page" : undefined}
              >
                {number}
              </Link>
            </span>
          ))}
        </div>
        {page < pages ? (
          <Link href={href(page + 1)}>Berikutnya</Link>
        ) : (
          <span aria-disabled="true">Berikutnya</span>
        )}
      </div>
    </nav>
  );
}
