import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComponentPreview } from "./preview";
import { PageContainer } from "@/components/app-shell";
import { allowsComponentPreview } from "@/domain/preview-access";

export const metadata: Metadata = {
  title: "Contoh komponen",
  description: "Katalog komponen antarmuka dengan data sintetis.",
};
export const dynamic = "force-dynamic";
export default function PreviewPage() {
  if (!allowsComponentPreview(process.env.APP_ENV, process.env.VERCEL_ENV)) notFound();
  return (
    <PageContainer>
      <ComponentPreview />
    </PageContainer>
  );
}
