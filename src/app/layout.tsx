import type { ReactNode } from "react";

export const metadata = {
  title: "CoveredNow",
  description: "School-confirmed fee bills, paid directly to the school.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>{children}</body>
    </html>
  );
}