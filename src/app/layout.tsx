import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import "./globals.css";

// Inter is the closest free match to Apple's San Francisco, and renders far softer
// on Windows than the system font. Served from this site, not from Google.
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const viewport = { themeColor: "#1d1d1f" };

export const metadata = {
  // Share cards need full addresses, so links shared on WhatsApp show a preview.
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: "CoveredNow",
  description:
    "Verified students list school-confirmed fee bills. Donors pay the school directly.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col bg-white font-sans text-slate-900 antialiased">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
