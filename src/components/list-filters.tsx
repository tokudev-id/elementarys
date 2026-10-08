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
import { Field } from "./field";
import { Button } from "./button";
import { DataTableToolbar } from "./data-table-toolbar";

export function ListFilters({
  q,
  query,
  searchLabel,
  children,
}: {
  q: string;
  query: Record<string, string>;
  searchLabel: string;
  children?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draft, setDraft] = useState({ source: q, value: q });
  if (draft.source !== q) setDraft({ source: q, value: q });
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function apply() {
    if (!formRef.current) return;
    const params = new URLSearchParams(query);
    for (const [key, value] of new FormData(formRef.current)) {
      if (String(value)) params.set(key, String(value));
      else params.delete(key);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params}`);
  }
  function search(event: ChangeEvent<HTMLInputElement>) {
    setDraft({ source: q, value: event.currentTarget.value });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(apply, 300);
  }
  function changeFilter(event: ChangeEvent<HTMLFormElement>) {
    if (event.target.getAttribute("name") !== "q") apply();
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    apply();
  }
  return (
    <DataTableToolbar>
      <form className="list-filter-form" ref={formRef} onSubmit={submit} onChange={changeFilter}>
        <Field
          label={searchLabel}
          name="q"
          type="search"
          value={draft.value}
          onChange={search}
          maxLength={200}
        />
        {children}
        <Button type="submit" variant="secondary">
          Tampilkan
        </Button>
        <Link href={pathname} className="list-reset">
          Reset filter
        </Link>
      </form>
    </DataTableToolbar>
  );
}
