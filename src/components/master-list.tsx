"use client";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./data-table";
import { MobileCardList } from "./mobile-card-list";
import { StatusBadge, type StatusTone } from "./status-badge";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

export type MasterRow = {
  id: string;
  title: string;
  href: string;
  meta: string;
  status: { label: string; tone: StatusTone };
  cells: Record<string, string>;
  classNames?: string[];
  actions: { label: string; href: string; destructive?: boolean }[];
};
export type MasterColumn = { key: string; label: string; desktopOnly?: boolean };

function Actions({ row }: { row: MasterRow }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" aria-label={`Aksi ${row.title}`} className="action-menu-trigger">
          <MoreHorizontal aria-hidden="true" size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {row.actions
          .filter((action) => !action.destructive)
          .map((action) => (
            <DropdownMenuItem
              key={action.label}
              asChild
              variant={action.destructive ? "destructive" : "default"}
            >
              <Link href={action.href}>{action.label}</Link>
            </DropdownMenuItem>
          ))}
        {row.actions.some((action) => action.destructive) && <DropdownMenuSeparator />}
        {row.actions
          .filter((action) => action.destructive)
          .map((action) => (
            <DropdownMenuItem key={action.label} asChild variant="destructive">
              <Link href={action.href}>{action.label}</Link>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function rowHref(row: MasterRow) {
  return row.href;
}

function mobileCard(row: MasterRow) {
  return (
    <article className="master-mobile-card">
      <div className="master-mobile-card__content">
        <div className="master-mobile-card__title-row">
          <Link href={row.href} className="master-name">
            {row.title}
          </Link>
          <StatusBadge tone={row.status.tone}>{row.status.label}</StatusBadge>
        </div>
        <p className="master-mobile-card__meta">{row.meta}</p>
      </div>
      <Actions row={row} />
    </article>
  );
}

export function MasterList({
  items,
  columns,
  label,
  currentSort,
  sortableColumns,
  query,
}: {
  items: MasterRow[];
  columns: MasterColumn[];
  label: string;
  currentSort?: string;
  sortableColumns?: Record<string, string>;
  query?: Record<string, string>;
}) {
  const definitions: ColumnDef<MasterRow>[] = [
    {
      id: "name",
      header: "Nama",
      cell: (context) => (
        <Link href={context.row.original.href} className="master-name">
          {context.row.original.title}
        </Link>
      ),
    },
    ...columns.map((column) => ({
      id: column.key,
      header: column.label,
      cell: (context: { row: { original: MasterRow } }) =>
        column.key === "classes" && context.row.original.classNames ? (
          <div className="class-chips">
            {context.row.original.classNames.slice(0, 2).map((name) => (
              <StatusBadge key={name} tone="info">
                {name}
              </StatusBadge>
            ))}
            {context.row.original.classNames.length > 2 && (
              <span>+{context.row.original.classNames.length - 2}</span>
            )}
            {!context.row.original.classNames.length && (
              <span className="empty-dash">—</span>
            )}
          </div>
        ) : (
          context.row.original.cells[column.key] || <span className="empty-dash">—</span>
        ),
    })),
    {
      id: "status",
      header: "Status",
      cell: (context) => (
        <StatusBadge tone={context.row.original.status.tone}>
          {context.row.original.status.label}
        </StatusBadge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Aksi</span>,
      cell: (context) => <Actions row={context.row.original} />,
    },
  ];

  return (
    <>
      <div className="master-desktop">
        <DataTable
          items={items}
          columns={definitions}
          label={label}
          desktopOnly={columns.filter((column) => column.desktopOnly).map((column) => column.key)}
          getRowHref={rowHref}
          currentSort={currentSort}
          sortableColumns={sortableColumns}
          query={query}
        />
      </div>
      <div className="master-mobile">
        <MobileCardList items={items} render={mobileCard} />
      </div>
    </>
  );
}
