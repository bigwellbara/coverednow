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
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import graduate from "@/assets/home/graduate.jpg";
import heroClassroom from "@/assets/home/hero-classroom.jpg";
import heroHandsRaised from "@/assets/home/hero-hands-raised.jpg";
import heroUniforms from "@/assets/home/hero-uniforms.jpg";
import teacherClass from "@/assets/home/teacher-class.jpg";
import { BillCard } from "@/components/bill-card";
import { CountUp } from "@/components/count-up";
import { JustFunded } from "@/components/just-funded";
import { TodaySection } from "@/components/today-section";
import { delay } from "@/lib/motion";
import { getBillService } from "@/modules/billing";
import { DEFAULT_FEED_FILTER, summariseNeed } from "@/modules/billing/domain/public-bill";

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

function Stat(props: { icon: ReactNode; value: ReactNode; label: string; delayMs: number }) {
  return (
    <div
      className="fade-up flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-5 backdrop-blur-xl"
      style={delay(props.delayMs)}
    >
      <span className="text-gold-300">{props.icon}</span>
      <span className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white tabular-nums">
        {props.value}
      </span>
      <span className="text-[13px] text-white/60">{props.label}</span>
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
  const need = summariseNeed(open);
  const iconClass = "size-6";

  return (
    <main>
      <section className="relative isolate overflow-hidden bg-brand-950">
        {/* Decorative photos: a slow zoom, with three classroom scenes taking turns. */}
        <div aria-hidden className="ken-burns absolute inset-0 -z-20">
          <Image
            src={heroHandsRaised}
            alt=""
            fill
            priority
            placeholder="blur"
            sizes="100vw"
            className="object-cover"
          />
          <Image src={heroClassroom} alt="" fill sizes="100vw" className="hero-slide-2 object-cover" />
          <Image src={heroUniforms} alt="" fill sizes="100vw" className="hero-slide-3 object-cover" />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-950/95 via-brand-950/75 to-brand-950/40"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-brand-950 to-transparent"
        />

        <div className="mx-auto max-w-6xl px-4 pt-24 pb-16 sm:pt-32 sm:pb-24 lg:pt-36">
          <p className="fade-up mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium tracking-[0.02em] text-gold-300">
            <ShieldCheck className="size-3.5" aria-hidden />
            School-confirmed fee bills in Zimbabwe
          </p>
          <h1
            className="fade-up max-w-3xl text-[3.25rem] leading-[1.02] font-semibold tracking-[-0.04em] text-white sm:text-[5.5rem]"
            style={delay(120)}
          >
            Your fees, <span className="text-metal">CoveredNow.</span>
          </h1>
          <p
            className="fade-up mt-6 max-w-xl text-lg leading-relaxed text-white/70 sm:text-[21px]"
            style={delay(240)}
          >
            Verified students list school-confirmed fee bills. Donors, at home and
            abroad, pay the school directly.
          </p>
          <div className="fade-up mt-10 flex flex-wrap items-center gap-3" style={delay(360)}>
            <Link href="/browse" className="group btn-champagne px-6">
              Browse bills
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <Link
              href="/sign-up"
              className="btn-secondary border-white/25 bg-white/[0.08] px-6 text-white backdrop-blur hover:border-white/40 hover:bg-white/15"
            >
              List a bill
            </Link>
          </div>

          {stats.raisedCents > 0 && (
            <div className="mt-12 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat
                delayMs={480}
                icon={<HandCoins className={iconClass} aria-hidden />}
                value={<CountUp value={stats.raisedCents} format="money" delayMs={500} />}
                label="raised for school fees"
              />
              <Stat
                delayMs={580}
                icon={<UsersRound className={iconClass} aria-hidden />}
                value={<CountUp value={stats.studentsSupported} delayMs={600} />}
                label={stats.studentsSupported === 1 ? "student supported" : "students supported"}
              />
              <Stat
                delayMs={680}
                icon={<Building2 className={iconClass} aria-hidden />}
                value={<CountUp value={stats.verifiedSchools} delayMs={700} />}
                label={stats.verifiedSchools === 1 ? "verified school" : "verified schools"}
              />
            </div>
          )}
        </div>
      </section>

      <JustFunded now={now} />
      <TodaySection open={open} now={now} />

      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="open-heading">
        <div className="reveal mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 id="open-heading" className="text-3xl font-semibold text-slate-900">
              Almost there
            </h2>
            <p className="mt-1 text-slate-600">Bills closest to being fully funded.</p>
          </div>
          <Link
            href="/browse"
            className="group inline-flex min-h-11 items-center gap-1 font-semibold text-brand-800 hover:underline"
          >
            View all
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
        {open.length === 0 ? (
          <div className="reveal card text-center text-slate-600">
            Every confirmed bill is funded right now. Thank you. New bills appear here
            as schools confirm them.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {open.slice(0, 3).map((bill) => (
              <div key={bill.id} className="reveal flex [&>article]:flex-1">
                <BillCard bill={bill} now={now} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section
        id="how-it-works"
        className="relative scroll-mt-20 overflow-hidden border-y border-slate-200 bg-white"
        aria-labelledby="how-heading"
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(var(--color-brand-100)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16">
          <div className="reveal max-w-2xl">
            <p className="text-sm font-semibold tracking-wider text-gold-700 uppercase">
              Four steps
            </p>
            <h2 id="how-heading" className="mt-1 text-3xl font-semibold text-slate-900">
              How it works
            </h2>
          </div>
          <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="reveal group rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg motion-reduce:hover:translate-y-0"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-full metal-graphite text-sm font-semibold text-white shadow-md">
                    {index + 1}
                  </span>
                  <span className="grid size-10 place-items-center rounded-xl bg-gold-50 text-gold-600 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                    <step.icon className="size-5" aria-hidden />
                  </span>
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20" aria-labelledby="trust-heading">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="reveal relative">
            <div
              aria-hidden
              className="absolute -top-4 -left-4 size-40 rounded-3xl bg-gold-200/70 sm:-top-6 sm:-left-6"
            />
            <div
              aria-hidden
              className="absolute -right-4 -bottom-4 size-32 rounded-full bg-brand-100 sm:-right-6 sm:-bottom-6"
            />
            <div className="group relative aspect-[4/3] overflow-hidden rounded-3xl shadow-xl">
              <Image
                src={graduate}
                alt="A graduate in cap and gown holding up a certificate"
                fill
                placeholder="blur"
                sizes="(min-width: 1024px) 34rem, 100vw"
                className="object-cover transition duration-700 group-hover:scale-105"
              />
            </div>
            <div className="bob absolute -bottom-6 left-6 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-slate-200">
              <span className="grid size-10 place-items-center rounded-full bg-brand-700 text-white">
                <Landmark className="size-5" aria-hidden />
              </span>
              <span className="text-sm leading-tight">
                <span className="block font-semibold text-slate-900">Paid to the school</span>
                <span className="text-slate-600">with proof attached</span>
              </span>
            </div>
          </div>

          <div className="reveal">
            <p className="text-sm font-semibold tracking-wider text-gold-700 uppercase">
              Why donors trust CoveredNow
            </p>
            <h2 id="trust-heading" className="mt-1 text-3xl font-semibold text-slate-900">
              Every dollar goes where it should
            </h2>
            <p className="mt-3 text-slate-600">
              Money never passes through a student&apos;s hands. We pay the school&apos;s
              own registered account, attach proof, and the school confirms receipt.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {PRINCIPLES.map((principle) => (
                <li
                  key={principle.text}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-brand-900 shadow-sm transition hover:border-brand-300 hover:shadow-md"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                    <principle.icon className="size-5" aria-hidden />
                  </span>
                  {principle.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        id="for-partners"
        className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-10"
        aria-labelledby="partners-heading"
      >
        <div className="reveal relative isolate grid gap-8 overflow-hidden rounded-3xl bg-gradient-to-br from-gold-100 via-gold-50 to-white p-8 ring-1 ring-gold-200 sm:p-12 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold tracking-wider text-gold-800 uppercase">
              For companies, foundations and philanthropists
            </p>
            <h2 id="partners-heading" className="mt-1 text-2xl font-semibold text-brand-950 sm:text-3xl">
              Make education your CSR legacy
            </h2>
            <p className="mt-3 max-w-xl text-slate-700">
              Adopt a school, run a CSR programme, or clear every open bill at once.
              Each dollar is confirmed by the school, paid to its account and backed by
              a receipt your board can verify.
            </p>
            <Link
              href="/partners"
              className="group btn-primary mt-6 px-6"
            >
              Partner with us
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
          {need.openBills > 0 && (
            <div className="rounded-2xl bg-brand-950 p-6 text-white shadow-xl">
              <p className="text-4xl font-semibold tracking-tight text-gold-400">
                <CountUp value={need.remainingCents} format="money" />
              </p>
              <p className="mt-2 text-brand-50/90">
                clears every school-confirmed bill on CoveredNow today, for{" "}
                {need.openBills === 1 ? "1 student" : `${need.openBills} students`} at{" "}
                {need.schools === 1 ? "1 school" : `${need.schools} schools`}.
              </p>
            </div>
          )}
        </div>
      </section>

      <section
        id="for-schools"
        className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-4"
        aria-labelledby="schools-heading"
      >
        <div className="reveal relative isolate overflow-hidden rounded-3xl bg-brand-800 p-8 text-white shadow-xl sm:p-12">
          <Image
            src={teacherClass}
            alt=""
            fill
            sizes="(min-width: 1152px) 72rem, 100vw"
            className="-z-20 object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-950/95 via-brand-900/85 to-brand-800/60"
          />
          <div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
              <MessageCircle className="size-7 text-gold-400" aria-hidden />
            </span>
            <div>
              <h2 id="schools-heading" className="text-2xl font-semibold sm:text-3xl">
                For schools: fee recovery that costs nothing
              </h2>
              <p className="mt-3 max-w-2xl text-brand-50/90">
                Your bursar gets a secure WhatsApp link for each bill and confirms it in
                one tap. Money raised is paid to your registered account, with proof, and
                you confirm receipt. You never deal with donors, and students never handle
                the money.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
