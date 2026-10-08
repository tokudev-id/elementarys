"use client";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import { Field } from "./field";
import { Button } from "./button";
import { DataTableToolbar } from "./data-table-toolbar";

export function ListFilters({
  q,
  query,
  searchLabel,
  activeFilterCount = 0,
  children,
}: {
  q: string;
  query: Record<string, string>;
  searchLabel: string;
  activeFilterCount?: number;
  children?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draft, setDraft] = useState({ source: q, value: q });
  const [sheetOpen, setSheetOpen] = useState(false);

  if (draft.source !== q) setDraft({ source: q, value: q });

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    if (!sheetOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSheetOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sheetOpen]);

  function apply() {
    if (!formRef.current) return;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const params = new URLSearchParams(query);
    for (const [key, value] of new FormData(formRef.current)) {
      if (String(value)) params.set(key, String(value));
      else params.delete(key);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params}#daftar`);
  }

  function search(event: ChangeEvent<HTMLInputElement>) {
    setDraft({ source: q, value: event.currentTarget.value });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(apply, 300);
  }

  function changeFilter(event: ChangeEvent<HTMLFormElement>) {
    if (event.target.getAttribute("name") !== "q") {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      apply();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    apply();
  }

  const hasActiveFilters = Boolean(
    q ||
      activeFilterCount > 0 ||
      Object.entries(query).some(
        ([k, v]) => k !== "page" && k !== "pageSize" && Boolean(v),
      ),
  );

  function openSheet() {
    setSheetOpen(true);
  }
  function closeSheet() {
    setSheetOpen(false);
  }

  return (
    <DataTableToolbar>
      <form
        className="list-filter-form"
        ref={formRef}
        onSubmit={submit}
        onChange={changeFilter}
      >
        <div className="list-filter-search-group">
          <Field
            label={searchLabel}
            name="q"
            type="search"
            value={draft.value}
            onChange={search}
            maxLength={200}
          />
          {children && (
            <Button
              type="button"
              variant="secondary"
              className="list-filter-mobile-trigger"
              onClick={openSheet}
              aria-label={`Buka filter daftar${activeFilterCount > 0 ? `, ${activeFilterCount} filter aktif` : ""}`}
            >
              <SlidersHorizontal size={18} aria-hidden="true" />
              <span>
                Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </span>
            </Button>
          )}
        </div>

        {children && (
          <>
            {sheetOpen && (
              <div
                className="list-filter-sheet-backdrop"
                onClick={closeSheet}
                aria-hidden="true"
              />
            )}
            <div
              className={`list-filter-fields ${sheetOpen ? "is-open" : ""}`}
              role={sheetOpen ? "dialog" : undefined}
              aria-modal={sheetOpen ? "true" : undefined}
              aria-label={sheetOpen ? "Filter daftar" : undefined}
            >
              <div className="list-filter-sheet-header">
                <h3 className="list-filter-sheet-title">Filter daftar</h3>
                <button
                  type="button"
                  className="list-filter-sheet-close"
                  onClick={closeSheet}
                  aria-label="Tutup filter"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              <div className="list-filter-fields-content">{children}</div>

              <div className="list-filter-actions">
                {hasActiveFilters && (
                  <Link
                    href={pathname}
                    className="list-reset"
                    onClick={closeSheet}
                  >
                    Reset filter
                  </Link>
                )}
                <Button
                  type="button"
                  className="list-filter-sheet-done"
                  onClick={closeSheet}
                >
                  Selesai
                </Button>
              </div>
            </div>
          </>
        )}

        {!children && hasActiveFilters && (
          <Link href={pathname} className="list-reset">
            Reset filter
          </Link>
        )}
      </form>
    </DataTableToolbar>
  );
}
