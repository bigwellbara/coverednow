import {
  ArrowRight,
  Building2,
  FileCheck2,
  HandCoins,
  HeartHandshake,
  Landmark,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { BillCard } from "@/components/bill-card";
import { getBillService } from "@/modules/billing";
import { formatMoney } from "@/modules/billing/domain/money";
import { DEFAULT_FEED_FILTER } from "@/modules/billing/domain/public-bill";

// The figures and bills change with every donation.
export const dynamic = "force-dynamic";

const STEPS = [
  {
    icon: FileCheck2,
    title: "A student lists a bill",
    body: "Verified students, or guardians for high schoolers, upload their fee statement.",
  },
  {
    icon: ShieldCheck,
    title: "The school confirms it",
    body: "The bursar confirms or corrects the amount. Only the confirmed amount is shown.",
  },
  {
    icon: HandCoins,
    title: "You fund it",
    body: "Give the whole balance or part of it, by EcoCash, OneMoney or card.",
  },
  {
    icon: ReceiptText,
    title: "The school is paid",
    body: "We pay the school's own account and attach proof. The school confirms receipt.",
  },
];

const PRINCIPLES = [
  { icon: Landmark, text: "Paid to the school, never to the student" },
  { icon: ShieldCheck, text: "Every bill confirmed by the school" },
  { icon: HeartHandshake, text: "100% of the bill reaches the school" },
  { icon: UsersRound, text: "Students shown by initials only" },
];

function Stat(props: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="card flex flex-col items-center gap-1 py-4 text-center">
      <span className="text-gold-600">{props.icon}</span>
      <span className="text-2xl font-bold text-brand-900 sm:text-3xl">{props.value}</span>
      <span className="text-sm text-slate-600">{props.label}</span>
    </div>
  );
}

export default async function HomePage() {
  const bills = getBillService();
  const [stats, open] = await Promise.all([
    bills.stats(),
    bills.listOpen(DEFAULT_FEED_FILTER),
  ]);
  const now = new Date();
  const iconClass = "size-6";

  return (
    <main>
      <section className="relative overflow-hidden border-b border-brand-100 bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:pt-20">
          <p className="chip mb-4 bg-white text-brand-800 shadow-sm">
            <ShieldCheck className="size-3.5" aria-hidden />
            School-confirmed fee bills in Zimbabwe
          </p>
          <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-brand-900 sm:text-6xl">
            Your fees, CoveredNow.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-700">
            Verified students list school-confirmed fee bills. Donors, at home and
            abroad, pay the school directly.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/browse" className="btn-primary px-6">
              Browse bills
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/sign-up" className="btn-gold px-6">
              List a bill
            </Link>
          </div>

          {stats.raisedCents > 0 && (
            <div className="mt-10 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat
                icon={<HandCoins className={iconClass} aria-hidden />}
                value={formatMoney(stats.raisedCents).replace(/\.00$/, "")}
                label="raised for school fees"
              />
              <Stat
                icon={<UsersRound className={iconClass} aria-hidden />}
                value={String(stats.studentsSupported)}
                label={stats.studentsSupported === 1 ? "student supported" : "students supported"}
              />
              <Stat
                icon={<Building2 className={iconClass} aria-hidden />}
                value={String(stats.verifiedSchools)}
                label={stats.verifiedSchools === 1 ? "verified school" : "verified schools"}
              />
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="open-heading">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 id="open-heading" className="text-2xl font-bold text-slate-900">
              Almost there
            </h2>
            <p className="text-slate-600">Bills closest to being fully funded.</p>
          </div>
          <Link
            href="/browse"
            className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand-800 hover:underline"
          >
            View all
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        {open.length === 0 ? (
          <div className="card text-center text-slate-600">
            Every confirmed bill is funded right now. Thank you. New bills appear here
            as schools confirm them.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {open.slice(0, 3).map((bill) => (
              <BillCard key={bill.id} bill={bill} now={now} />
            ))}
          </div>
        )}
      </section>

      <section
        id="how-it-works"
        className="scroll-mt-20 border-y border-slate-200 bg-white"
        aria-labelledby="how-heading"
      >
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 id="how-heading" className="text-2xl font-bold text-slate-900">
            How it works
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-2xl bg-slate-50 p-5">
                <span className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <step.icon className="size-5 text-gold-600" aria-hidden />
                </span>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{step.body}</p>
              </li>
            ))}
          </ol>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map((principle) => (
              <li key={principle.text} className="flex items-center gap-2 text-sm font-medium text-brand-900">
                <principle.icon className="size-5 shrink-0 text-brand-700" aria-hidden />
                {principle.text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="for-schools"
        className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12"
        aria-labelledby="schools-heading"
      >
        <div className="flex gap-4 rounded-3xl bg-brand-800 p-8 text-white sm:p-10">
          <MessageCircle className="size-8 shrink-0 text-gold-400" aria-hidden />
          <div>
            <h2 id="schools-heading" className="text-2xl font-bold">
              For schools: fee recovery that costs nothing
            </h2>
            <p className="mt-2 max-w-2xl text-brand-100">
              Your bursar gets a secure WhatsApp link for each bill and confirms it in
              one tap. Money raised is paid to your registered account, with proof, and
              you confirm receipt. You never deal with donors, and students never handle
              the money.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
