"use client";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

export function DataTable<T>({
  items,
  columns,
  label,
  desktopOnly = [],
  getRowHref,
}: {
  items: T[];
  columns: ColumnDef<T>[];
  label: string;
  desktopOnly?: string[];
  getRowHref?: (item: T) => string;
}) {
  "use no memo";
  const router = useRouter();
  function openRow(event: MouseEvent<HTMLTableRowElement>) {
    if ((event.target as HTMLElement).closest("a, button, input, [role='menuitem']")) return;
    const href = event.currentTarget.dataset.href;
    if (href) router.push(href);
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
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={
                    desktopOnly.includes(header.column.id) ? "data-column--desktop" : undefined
                  }
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} data-href={getRowHref?.(row.original)} onClick={openRow}>
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={
                    desktopOnly.includes(cell.column.id) ? "data-column--desktop" : undefined
                  }
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
