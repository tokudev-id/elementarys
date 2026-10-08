"use client";
import { useEffect, useRef, type ReactNode, type FocusEvent } from "react";
import { Dialog as RadixDialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./button";

export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
  variant = "dialog",
  closeDisabled = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  variant?: "dialog" | "sheet";
  closeDisabled?: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function resize() {
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && bodyRef.current?.contains(focused))
        focused.scrollIntoView({ block: "nearest" });
    }
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", resize);
    window.addEventListener("resize", resize);
    return () => {
      viewport?.removeEventListener("resize", resize);
      window.removeEventListener("resize", resize);
    };
  }, [open]);
  function changeOpen(value: boolean) {
    if (!value && !closeDisabled) onClose();
  }
  function focusOpen(event: Event) {
    event.preventDefault();
    previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
  }
  function focusClose(event: Event) {
    event.preventDefault();
    previousFocus.current?.focus();
  }
  function preventDismiss(event: Event) {
    if (closeDisabled) event.preventDefault();
  }
  function keepFocusVisible(event: FocusEvent<HTMLDivElement>) {
    const focused = event.target;
    requestAnimationFrame(() => {
      if (focused.isConnected) focused.scrollIntoView({ block: "nearest" });
    });
  }
  return (
    <RadixDialog open={open} onOpenChange={changeOpen}>
      <DialogContent
        className={`app-dialog app-dialog--${variant} translate-x-0 translate-y-0`}
        showCloseButton={false}
        onOpenAutoFocus={focusOpen}
        onCloseAutoFocus={focusClose}
        onEscapeKeyDown={preventDismiss}
        onInteractOutside={preventDismiss}
      >
        <header className="app-dialog__header">
          <DialogTitle>{title}</DialogTitle>
          <Button
            ref={closeRef}
            variant="ghost"
            type="button"
            disabled={closeDisabled}
            onClick={onClose}
            aria-label={`Tutup ${title}`}
          >
            Tutup
          </Button>
        </header>
        <DialogDescription className="sr-only">{title}</DialogDescription>
        <div className="app-dialog__body" ref={bodyRef} onFocusCapture={keepFocusVisible}>
          {children}
        </div>
        {actions && <footer className="app-dialog__actions">{actions}</footer>}
      </DialogContent>
    </RadixDialog>
  );
}
