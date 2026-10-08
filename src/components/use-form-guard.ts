"use client";
import { useEffect, useRef } from "react";

export function useFormGuard(errors: Record<string, string[]>) {
  const ref = useRef<HTMLFormElement>(null);
  const dirty = useRef(false);
  function markDirty() {
    dirty.current = true;
  }
  function markSaved() {
    dirty.current = false;
  }
  useEffect(() => {
    function unload(event: BeforeUnloadEvent) {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    function navigate(event: MouseEvent) {
      if (
        !dirty.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank") return;
      const destination = new URL(link.href);
      if (destination.pathname === location.pathname && destination.search === location.search)
        return;
      if (!window.confirm("Perubahan belum tersimpan. Tinggalkan halaman ini?")) {
        event.preventDefault();
        event.stopPropagation();
      } else dirty.current = false;
    }
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, []);
  useEffect(() => {
    if (Object.keys(errors).length)
      ref.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);
  return { ref, markDirty, markSaved };
}
