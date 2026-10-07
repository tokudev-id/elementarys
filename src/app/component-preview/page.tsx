import { notFound } from "next/navigation";
import { ComponentPreview } from "./preview";
import { PageContainer } from "@/components/app-shell";
export const dynamic = "force-dynamic";
export default function PreviewPage() {
  if (! ["test", "development", "preview"].includes(process.env.APP_ENV ?? "") || process.env.VERCEL_ENV === "production") notFound();
  return <PageContainer><ComponentPreview /></PageContainer>;
}
