"use client";
import type { ReactNode } from "react";
import { Dialog } from "./dialog";
import { Button } from "./button";

export function ConfirmDialog({
  open,
  title,
  children,
  onClose,
  onConfirm,
  label,
  pending = false,
  destructive = false,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  label: string;
  pending?: boolean;
  destructive?: boolean;
}) {
  return (
    <Dialog
      open={open}
      title={title}
      onClose={onClose}
      closeDisabled={pending}
      actions={
        <>
          <Button variant="secondary" type="button" disabled={pending} onClick={onClose}>
            Batal
          </Button>
          <Button
            variant={destructive ? "destructive" : "primary"}
            pending={pending}
            onClick={onConfirm}
          >
            {label}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
