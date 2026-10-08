"use client";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import type { MouseEvent } from "react";

export function DataTable<T>({
  items,
  columns,
  label,
  desktopOnly = [],
  getRowHref,
  currentSort,
  sortableColumns = {},
  query = {},
}: {
  items: T[];
  columns: ColumnDef<T>[];
  label: string;
  desktopOnly?: string[];
  getRowHref?: (item: T) => string;
  currentSort?: string;
  sortableColumns?: Record<string, string>;
  query?: Record<string, string>;
}) {
  "use no memo";
  const router = useRouter();
  const pathname = usePathname();

  function openRow(event: MouseEvent<HTMLTableRowElement>) {
    if ((event.target as HTMLElement).closest("a, button, input, [role='menuitem']")) return;
    const href = event.currentTarget.dataset.href;
    if (href) router.push(href);
  }

  function handleSort(sortKey: string) {
    const params = new URLSearchParams(query);
    params.set("sort", sortKey);
    params.set("page", "1");
    router.push(`${pathname}?${params}#daftar`);
  }

  function onSortClick(event: MouseEvent<HTMLButtonElement>) {
    const key = event.currentTarget.dataset.sort;
    if (key) handleSort(key);
  }

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  return (
    <div className="data-table">
      <Table aria-label={label}>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const sortKey = sortableColumns[header.column.id];
                const isSorted = sortKey && currentSort === sortKey;
                const isActions = header.column.id === "actions";
                const isDesktop = desktopOnly.includes(header.column.id);

                return (
                  <TableHead
                    key={header.id}
                    aria-sort={sortKey ? (isSorted ? "ascending" : "none") : undefined}
                    className={[
                      isDesktop ? "data-column--desktop" : "",
                      isActions ? "data-column--actions" : "",
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined}
                  >
                    {header.isPlaceholder ? null : sortKey ? (
                      <button
                        type="button"
                        className="data-table-sort-header"
                        data-sort={sortKey}
                        onClick={onSortClick}
                        aria-label={`Urutkan berdasarkan ${typeof header.column.columnDef.header === "string" ? header.column.columnDef.header : header.column.id}`}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown size={14} aria-hidden="true" className="sort-icon" />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} data-href={getRowHref?.(row.original)} onClick={openRow}>
              {row.getVisibleCells().map((cell) => {
                const isActions = cell.column.id === "actions";
                const isDesktop = desktopOnly.includes(cell.column.id);

                return (
                  <TableCell
                    key={cell.id}
                    className={[
                      isDesktop ? "data-column--desktop" : "",
                      isActions ? "data-column--actions" : "",
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
