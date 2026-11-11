import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata = {
  title: "CoveredNow",
  description:
    "Verified students list school-confirmed fee bills. Donors pay the school directly.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
