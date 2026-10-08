"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mutationResultSchema } from "@/contracts/mutations";
import { HttpError, requestJson } from "@/lib/http-client";
import type { BannerState } from "./state-banner";
import { toast } from "sonner";

export function useMutation(
  url: string,
  method: "POST" | "PATCH" | "PUT",
  onReload?: () => void,
  options: { refresh?: boolean; successMessage?: string } = {},
) {
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
    if (busy.current) return null;
    busy.current = true;
    setPending(true);
    setNotice(null);
    setErrors({});
    try {
      const result = await requestJson(
        url,
        { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
        mutationResultSchema,
      );
      const message = options.successMessage ?? "Perubahan tersimpan.";
      setNotice({ state: "saved", message });
      toast.success(message);
      if (options.refresh !== false) startRefresh(() => router.refresh());
      return result;
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
      return null;
    } finally {
      setPending(false);
      busy.current = false;
    }
  }
  return { pending: pending || refreshing, notice, errors, mutate, reloadLatest };
}
