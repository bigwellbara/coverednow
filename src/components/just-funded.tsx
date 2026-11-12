import { PartyPopper } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { timeAgo } from "@/lib/format";
import { getBillService } from "@/modules/billing";
import { termLabel } from "@/modules/billing/domain/bill";

/**
 * A scrolling strip of bills that reached 100% in the last week. Each item shows
 * twice so the loop never jumps; the copy is hidden from screen readers, and for
 * people who prefer less motion it simply sits still and can be scrolled.
 */
export async function JustFunded({ now }: { now: Date }) {
  const bills = (
    await getBillService().listRecentlyFunded(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
  ).slice(0, 12);
  if (bills.length === 0) return null;

  const items = (copy: boolean) =>
    bills.map((bill) => (
      <li key={`${copy ? "copy-" : ""}${bill.id}`} aria-hidden={copy || undefined} className="shrink-0">
        <Link
          href={`/browse/${bill.id}`}
          tabIndex={copy ? -1 : undefined}
          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm whitespace-nowrap ring-1 ring-white/15 transition hover:bg-white/20"
        >
          <PartyPopper className="size-4 text-gold-400" aria-hidden />
          <strong>{bill.studentInitials}</strong>
          <span className="text-brand-100">
            {termLabel(bill.term)} at {bill.schoolName}: fully funded
          </span>
          {bill.fundedAt && <span className="text-xs text-brand-200/70">{timeAgo(bill.fundedAt, now)}</span>}
        </Link>
      </li>
    ));

  return (
    <section aria-labelledby="just-funded-heading" className="bg-brand-900 text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <h2
          id="just-funded-heading"
          className="shrink-0 text-xs font-semibold tracking-wider text-gold-300 uppercase"
        >
          Just funded
        </h2>
        <div className="min-w-0 flex-1 overflow-x-auto [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)] motion-safe:overflow-hidden">
          <ul
            className="marquee flex w-max gap-3"
            style={{ "--duration": `${Math.max(bills.length * 6, 20)}s` } as CSSProperties}
          >
            {items(false)}
            {items(true)}
          </ul>
        </div>
      </div>
    </section>
  );
}
