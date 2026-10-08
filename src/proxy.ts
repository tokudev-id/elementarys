import { NextResponse } from "next/server";
import { allowsComponentPreview } from "@/domain/preview-access";

export function proxy() {
  if (!allowsComponentPreview(process.env.APP_ENV, process.env.VERCEL_ENV)) {
    return new NextResponse("Halaman tidak ditemukan.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/component-preview/:path*",
};
