"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "./button";
import { StateBanner } from "./state-banner";
import type { ReportInput } from "@/contracts/reports";
import { HttpError, responseError } from "@/lib/http-client";

export function ReportDownload({ input }: { input: ReportInput }) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<{ message: string; expired: boolean } | null>(null);
  async function download() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setFailure(null);
    try {
      const query = new URLSearchParams({ yearId: input.yearId, month: input.month });
      if (input.classId) query.set("classId", input.classId);
      const response = await fetch(`/api/reports/attendance.xlsx?${query}`, { cache: "no-store" });
      if (!response.ok) throw await responseError(response);
      if (!response.headers.get("content-type")?.includes("spreadsheetml.sheet"))
        throw new Error("Berkas rekap belum dapat diterima.");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rekap-${input.month}.xlsx`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      router.refresh();
    } catch (error) {
      setFailure({
        message:
          error instanceof HttpError
            ? error.message
            : "Belum dapat mengunduh Excel. Periksa koneksi dan coba kembali.",
        expired: error instanceof HttpError && error.status === 401,
      });
    } finally {
      setPending(false);
      busy.current = false;
    }
  }
  return (
    <div>
      <Button pending={pending} onClick={download}>
        {pending ? "Sedang menyiapkan Excel…" : "Unduh Excel"}
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
