"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ChangeEvent } from "react";

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
  const router = useRouter();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);

  const numbers = Array.from({ length: pages }, (_, index) => index + 1).filter(
    (number) => number === 1 || number === pages || Math.abs(number - page) <= 1,
  );

  function href(target: number, newPageSize = pageSize) {
    const params = new URLSearchParams({
      ...query,
      page: String(target),
      pageSize: String(newPageSize),
    });
    return `${pathname}?${params}#daftar`;
  }

  function changePageSize(event: ChangeEvent<HTMLSelectElement>) {
    const nextSize = Number(event.target.value);
    router.push(href(1, nextSize));
  }

  return (
    <nav className="data-pagination" aria-label="Halaman daftar">
      <div className="data-pagination__left">
        <span className="data-pagination__summary-desktop">
          Menampilkan {from}–{to} dari {total}
        </span>
        <span className="data-pagination__summary-mobile">
          {from}–{to} dari {total}
        </span>
        <div className="data-pagination__page-size">
          <label htmlFor="pagination-page-size">Baris per halaman</label>
          <select
            id="pagination-page-size"
            value={pageSize}
            onChange={changePageSize}
            aria-label="Jumlah baris per halaman"
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="data-pagination__controls">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            className="data-pagination__arrow"
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft size={18} aria-hidden="true" />
            <span className="sr-only">Sebelumnya</span>
          </Link>
        ) : (
          <span
            className="data-pagination__arrow"
            aria-disabled="true"
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft size={18} aria-hidden="true" />
            <span className="sr-only">Sebelumnya</span>
          </span>
        )}

        <div className="pagination-numbers">
          {numbers.map((number, index) => (
            <span key={number} className="pagination-number-item">
              {index > 0 && number - numbers[index - 1] > 1 && (
                <span className="pagination-ellipsis" aria-hidden="true">
                  …
                </span>
              )}
              <Link
                href={href(number)}
                className="pagination-number-btn"
                aria-label={`Halaman ${number}`}
                aria-current={number === page ? "page" : undefined}
              >
                {number}
              </Link>
            </span>
          ))}
        </div>

        {page < pages ? (
          <Link
            href={href(page + 1)}
            className="data-pagination__arrow"
            aria-label="Halaman berikutnya"
          >
            <ChevronRight size={18} aria-hidden="true" />
            <span className="sr-only">Berikutnya</span>
          </Link>
        ) : (
          <span
            className="data-pagination__arrow"
            aria-disabled="true"
            aria-label="Halaman berikutnya"
          >
            <ChevronRight size={18} aria-hidden="true" />
            <span className="sr-only">Berikutnya</span>
          </span>
        )}
      </div>
    </nav>
  );
}
