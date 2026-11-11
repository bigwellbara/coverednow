"use client";

import { Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-checks a payment that hasn't finished, for a couple of minutes at most. */
export function RefreshWhilePending({ seconds = 5, times = 24 }) {
  const router = useRouter();
  useEffect(() => {
    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      if (count > times) clearInterval(timer);
      else router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds, times]);
  return null;
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-secondary print:hidden">
      <Printer className="size-4" aria-hidden />
      Print receipt
    </button>
  );
}
