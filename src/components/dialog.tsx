"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./button";
export function Dialog({ open, onClose, title, children, actions, variant = "dialog", closeDisabled = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; actions?: ReactNode; variant?: "dialog" | "sheet"; closeDisabled?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const viewport = window.visualViewport;
    const resize = () => {
      dialog.style.setProperty("--dialog-viewport-height", `${viewport?.height ?? window.innerHeight}px`);
      dialog.style.setProperty("--dialog-viewport-top", `${viewport?.offsetTop ?? 0}px`);
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && dialog.contains(focused)) focused.scrollIntoView({ block: "nearest" });
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    window.addEventListener("resize", resize);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      window.removeEventListener("resize", resize);
      document.body.style.overflow = oldOverflow;
      dialog.close();
      previousFocus?.focus();
    };
  }, [open]);
  return <dialog ref={ref} className={`ui-dialog ui-dialog--${variant}`} aria-labelledby={titleId} onKeyDown={event => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }} onCancel={event => { event.preventDefault(); if(!closeDisabled)onClose(); }}>
    <div className="ui-dialog__layout"><header className="ui-dialog__header"><h2 id={titleId}>{title}</h2><Button variant="secondary" type="button" disabled={closeDisabled} onClick={onClose} aria-label={`Tutup ${title}`}>Tutup</Button></header><div className="ui-dialog__body">{children}</div>{actions && <footer className="ui-dialog__actions">{actions}</footer>}</div>
  </dialog>;
}
