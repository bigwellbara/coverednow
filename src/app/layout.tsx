import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "CoveredNow",
  description: "School-confirmed fee bills, paid directly to the school.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
