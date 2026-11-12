"use client";

import {
  HandCoins,
  Megaphone,
  MessageSquareHeart,
  ReceiptText,
  School,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/verifications", label: "Verifications", icon: UserCheck },
  { href: "/admin/schools", label: "Schools", icon: School },
  { href: "/admin/bills", label: "Bills", icon: ReceiptText },
  { href: "/admin/donations", label: "Donations", icon: HandCoins },
  { href: "/admin/notes", label: "Notes", icon: MessageSquareHeart },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
];

/** The admin tabs, with the current section highlighted. */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="-mb-px flex gap-1 overflow-x-auto text-sm">
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-t-xl px-4 font-medium transition-colors ${
              active
                ? "bg-slate-50 text-brand-900"
                : "text-brand-100/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <link.icon className={`size-4 ${active ? "text-brand-700" : ""}`} aria-hidden />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
