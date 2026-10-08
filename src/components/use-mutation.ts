"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mutationResultSchema } from "@/contracts/mutations";
import { HttpError, requestJson } from "@/lib/http-client";
import type { BannerState } from "./state-banner";
import { toast } from "sonner";

export function useMutation(url: string, method: "POST" | "PATCH" | "PUT", onReload?: () => void) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [notice, setNotice] = useState<{ state: BannerState; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  function reloadLatest() {
    onReload?.();
    setNotice(null);
    setErrors({});
    startRefresh(() => router.refresh());
  }
  async function mutate(input: unknown) {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    setNotice(null);
    setErrors({});
    try {
      await requestJson(
        url,
        { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
        mutationResultSchema,
      );
      setNotice({ state: "saved", message: "Perubahan tersimpan." });
      toast.success("Perubahan tersimpan.");
      startRefresh(() => router.refresh());
      return true;
    } catch (error) {
      if (error instanceof HttpError) setErrors(error.fieldErrors);
      setNotice({
        state:
          error instanceof HttpError && error.status === 401
            ? "session-expired"
            : error instanceof HttpError && error.status === 409
              ? "conflict"
              : "error",
        message:
          error instanceof HttpError
            ? error.message
            : "Belum mendapat konfirmasi perubahan. Periksa koneksi dan coba kembali; isian tetap di halaman ini.",
      });
      return false;
    } finally {
      setPending(false);
      busy.current = false;
    }
  }
  return { pending: pending || refreshing, notice, errors, mutate, reloadLatest };
}
