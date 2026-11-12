import { ArrowRight, Heart, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Confetti, DrawnCheck } from "@/components/celebration";
import { heroButton } from "@/components/page-hero";
import { ProgressBar } from "@/components/progress-bar";
import { delay } from "@/lib/motion";
import { getBillService } from "@/modules/billing";
import { termLabel } from "@/modules/billing/domain/bill";
import { formatMoney } from "@/modules/billing/domain/money";
import { isOpenForDonations, percentFunded } from "@/modules/billing/domain/public-bill";
import { getPaymentService } from "@/modules/payments";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  const gift = await getPaymentService().findPublicGift(id);
  if (!gift) return null;
  const bill = await getBillService().findPublic(gift.billId);
  return bill ? { gift, bill } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await load((await params).id);
  if (!found) return { title: "CoveredNow" };
  const who = found.gift.displayName ?? "Someone";
  return {
    title: `${who} helped cover school fees - CoveredNow`,
    description: `${who} gave ${formatMoney(found.gift.amountCents)} toward ${termLabel(found.bill.term)} fees at ${found.bill.schoolName}, paid straight to the school.`,
    robots: { index: false },
  };
}

/** The page a donor shares after giving. Shows only what the bill page already shows. */
export default async function GiftPage({ params }: Props) {
  const found = await load((await params).id);
  if (!found) notFound();
  const { gift, bill } = found;
  const who = gift.displayName ?? "Someone";
  const percent = percentFunded(bill);
  const open = isOpenForDonations(bill, new Date());

  return (
    <main className="relative isolate overflow-hidden bg-brand-950 text-white">
      <Confetti count={30} />
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:py-24">
        <span className="pop-in inline-block text-gold-400">
          <DrawnCheck className="size-20" />
        </span>
        <h1 className="fade-up mt-4 text-3xl font-semibold tracking-tight sm:text-5xl" style={delay(400)}>
          {who} helped a student stay in school
        </h1>
        <p className="fade-up mt-4 text-lg text-brand-50/90" style={delay(550)}>
          A gift of <strong className="text-gold-400">{formatMoney(gift.amountCents)}</strong> toward{" "}
          {termLabel(bill.term)} fees for {bill.studentInitials}, {bill.studentLevel} at{" "}
          {bill.schoolName}, paid straight to the school.
        </p>

        <div className="fade-up mx-auto mt-8 max-w-md space-y-2 rounded-2xl bg-white/10 p-5 text-left ring-1 ring-white/15 backdrop-blur" style={delay(700)}>
          <p className="flex justify-between text-sm">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-gold-400" aria-hidden />
              School-confirmed bill
            </span>
            <span className="font-semibold">{percent}% funded</span>
          </p>
          <ProgressBar percent={percent} label={`${percent}% funded`} />
        </div>

        <div className="fade-up mt-8 flex flex-wrap justify-center gap-3" style={delay(850)}>
          {open ? (
            <Link href={`/browse/${bill.id}`} className={heroButton}>
              <Heart className="size-4" aria-hidden />
              Add your gift
            </Link>
          ) : (
            <Link href="/browse" className={heroButton}>
              Help another student
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
