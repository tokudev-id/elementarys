"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "./button";
import { StateBanner } from "./state-banner";
import { printReceiptSchema, type PrintSnapshot } from "@/contracts/print-report";
import { requestJson, HttpError } from "@/lib/http-client";

export function PrintReportButton({ snapshot }: { snapshot: PrintSnapshot }) {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<{ message: string; expired: boolean } | null>(null);
  async function print() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setFailure(null);
    try {
      await requestJson(
        "/api/reports/exports",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(snapshot),
        },
        printReceiptSchema,
      );
      window.print();
    } catch (error) {
      setFailure({
        message:
          error instanceof HttpError
            ? error.message
            : "Belum dapat mencatat pencetakan. Periksa koneksi dan coba kembali.",
        expired: error instanceof HttpError && error.status === 401,
      });
    } finally {
      setPending(false);
      busy.current = false;
    }
  }
  return (
    <div>
      <Button pending={pending} onClick={print}>
        {pending ? "Sedang menyiapkan cetak…" : "Cetak"}
      </Button>
      {failure && (
        <StateBanner
          state={failure.expired ? "session-expired" : "error"}
          action={failure.expired ? <Link href="/login">Masuk kembali</Link> : undefined}
        >
          {failure.message}
        </StateBanner>
      )}
    </div>
  );
}
