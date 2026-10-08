"use client";
import { useSyncExternalStore, type ReactNode } from "react";
import { Toaster, type ToasterProps } from "sonner";
import { TooltipProvider } from "./ui/tooltip";

const query = "(max-width: 639px)";
const toastOptions: ToasterProps["toastOptions"] = { closeButtonAriaLabel: "Tutup notifikasi" };
function subscribe(listener: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
function mobileSnapshot() {
  return window.matchMedia(query).matches;
}
function serverSnapshot() {
  return false;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const mobile = useSyncExternalStore(subscribe, mobileSnapshot, serverSnapshot);
  return (
    <TooltipProvider delayDuration={350}>
      {children}
      <Toaster
        className="app-toaster"
        theme="light"
        position={mobile ? "top-center" : "top-right"}
        duration={4000}
        closeButton
        containerAriaLabel="Notifikasi"
        toastOptions={toastOptions}
      />
    </TooltipProvider>
  );
}
