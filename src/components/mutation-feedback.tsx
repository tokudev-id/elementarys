"use client";
import Link from "next/link";
import { Button } from "./button";
import { StateBanner } from "./state-banner";
import type { useMutation } from "./use-mutation";

export function MutationFeedback({ mutation }: { mutation: ReturnType<typeof useMutation> }) {
  if (mutation.pending)
    return <StateBanner state="loading">Menunggu konfirmasi perubahan.</StateBanner>;
  const notice = mutation.notice;
  if (!notice) return null;
  return (
    <StateBanner
      state={notice.state}
      action={
        notice.state === "conflict" ? (
          <Button
            type="button"
            variant="secondary"
            disabled={mutation.pending}
            onClick={mutation.reloadLatest}
          >
            Muat data terbaru
          </Button>
        ) : notice.state === "session-expired" ? (
          <Link href="/login">Masuk kembali</Link>
        ) : undefined
      }
    >
      {notice.message}
    </StateBanner>
  );
}
