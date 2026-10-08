"use client";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "./ui/tooltip";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={350}>
      {children}
      <Toaster
        className="app-toaster"
        theme="light"
        position="top-right"
        duration={4000}
        closeButton
      />
    </TooltipProvider>
  );
}
