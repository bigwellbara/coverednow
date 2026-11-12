import {
  ArrowRight,
  Building2,
  ChevronDown,
  Globe2,
  HandCoins,
  Landmark,
  LineChart,
  ReceiptText,
  School,
  Share2,
  ShieldCheck,
  Target,
  UsersRound,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import graduate from "@/assets/home/graduate.jpg";
import teacherClass from "@/assets/home/teacher-class.jpg";
import { CountUp } from "@/components/count-up";
import { heroButton, heroGhostButton, PageHero } from "@/components/page-hero";
import { delay, stagger } from "@/lib/motion";
import { getBillService } from "@/modules/billing";
import { formatMoney } from "@/modules/billing/domain/money";
import { DEFAULT_FEED_FILTER, summariseNeed } from "@/modules/billing/domain/public-bill";
import { EnquiryForm } from "./enquiry-form";
import { ImpactCalculator } from "./impact-calculator";

export const metadata: Metadata = {
  title: "For companies and philanthropists - CoveredNow",
  description:
    "Fund school fees confirmed by the school and paid straight to its account. Verifiable education impact for CSR programmes, foundations and major donors.",
};
// The figures change with every donation.
export const dynamic = "force-dynamic";

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Need confirmed by the school",
    body: "A bursar confirms each student and the exact amount before anyone can give. You never fund a guess.",
  },
  {
    icon: Landmark,
    title: "No leakage",
    body: "Money goes to the school's own registered account, never to a student or a middleman. Any tip and processing fee are shown separately, so the full gift reaches the bill.",
  },
  {
    icon: ReceiptText,
    title: "An audit trail for every dollar",
    body: "Every gift has its own reference and receipt, and every bill shows its journey from listing to the school confirming it was paid.",
  },
  {
    icon: UsersRound,
    title: "Impact with dignity",
    body: "Students are shown by initials only. You see real progress without anyone being put on display.",
  },
];

const CSR_POINTS = [
  { icon: Globe2, text: "Directly advances UN Sustainable Development Goal 4, quality education." },
  { icon: Target, text: "A clear, countable outcome: fees paid, students able to sit their exams." },
  { icon: LineChart, text: "Fits the social pillar of ESG, with records you can verify." },
  { icon: Share2, text: "A public progress page for each bill, to share with staff and boards." },
];

const FAQS = [
  {
    q: "Does all of our money reach the school?",
    a: "Yes. The amount you give for a bill is paid to the school's registered account. An optional tip for CoveredNow and the payment processing fee are shown separately before you pay, never taken out of the gift.",
  },
  {
    q: "How do we know a bill is real?",
    a: "We check each student's identity documents, and the school's bursar confirms the student and the amount through a secure link before the bill is listed. Donors only ever see the amount the school confirmed.",
  },
  {
    q: "Can we choose the schools, regions or levels we support?",
    a: "Yes. You can filter open bills by school, level and amount and fund them yourself, or tell us your focus and we'll match a programme to confirmed bills.",
  },
  {
    q: "Can we give without our name being shown?",
    a: "Yes. Each gift can be shown under your name, a name you choose, or as anonymous.",
  },
  {
    q: "Are donations tax-deductible?",
    a: "Donations are gifts paid to the school. How they are treated for tax depends on where your organisation is based, so please check with your tax adviser.",
  },
  {
    q: "We'd like to give a large amount. How do we pay?",
    a: "Smaller gifts can be paid online with EcoCash, OneMoney or a bank card. For a larger programme, send us an enquiry and we'll agree the best way to pay with you.",
  },
];

export default async function PartnersPage() {
  const service = getBillService();
  const [open, stats] = await Promise.all([
    service.listOpen(DEFAULT_FEED_FILTER),
    service.stats(),
  ]);
  const need = summariseNeed(open);
  const money = (cents: number) => formatMoney(cents).replace(/\.00$/, "");

  return (
    <main>
      <PageHero
        image={graduate}
        overlap
        eyebrow="For companies, foundations and philanthropists"
        title={
          <>
            Put your giving where <br className="hidden sm:block" />
            <span className="text-gold-400">you can see it work.</span>
          </>
        }
        subtitle="Fund school fees that the school itself has confirmed, paid straight into the school's own account. Every dollar is traceable, from your gift to the school's receipt."
        actions={
          <>
            <a href="#enquire" className={heroButton}>
              Talk to us
              <ArrowRight className="size-4" aria-hidden />
            </a>
            <Link href="/browse" className={heroGhostButton}>
              See open bills
            </Link>
          </>
        }
      />

      {/* The live need: what it would take to clear every confirmed bill today. */}
      <div className="mx-auto max-w-6xl px-4">
        <section
          className="fade-up card relative -mt-14 overflow-hidden p-0 shadow-2xl shadow-brand-950/15"
          style={delay(350)}
          aria-labelledby="need-heading"
        >
          <div className="h-1.5 bg-gradient-to-r from-gold-600 via-gold-400 to-gold-300" />
          {need.openBills > 0 ? (
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
              <div>
                <h2 id="need-heading" className="text-sm font-semibold tracking-wider text-gold-700 uppercase">
                  The need, right now
                </h2>
                <p className="mt-2 text-5xl font-semibold tracking-tight text-brand-900 sm:text-6xl">
                  <CountUp value={need.remainingCents} format="money" delayMs={500} />
                </p>
                <p className="mt-2 max-w-xl text-lg text-slate-700">
                  would clear every school-confirmed fee bill on CoveredNow today. One
                  decision could see{" "}
                  <strong className="text-brand-800">
                    {need.openBills === 1 ? "a student" : `${need.openBills} students`}
                  </strong>{" "}
                  start the term with nothing owing.
                </p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  { icon: UsersRound, value: need.openBills, label: need.openBills === 1 ? "student waiting" : "students waiting" },
                  { icon: School, value: need.schools, label: need.schools === 1 ? "school" : "schools" },
                ].map((item, index) => (
                  <li
                    key={item.label}
                    className="fade-up flex items-center gap-3 rounded-2xl bg-brand-50 p-4"
                    style={stagger(index, 100, 600)}
                  >
                    <item.icon className="size-6 text-brand-700" aria-hidden />
                    <span>
                      <span className="block text-2xl font-semibold text-brand-900">
                        <CountUp value={item.value} delayMs={650} />
                      </span>
                      <span className="text-sm text-slate-600">{item.label}</span>
                    </span>
                  </li>
                ))}
                <li
                  className="fade-up flex items-center gap-3 rounded-2xl bg-gold-50 p-4"
                  style={stagger(2, 100, 600)}
                >
                  <HandCoins className="size-6 text-gold-700" aria-hidden />
                  <span>
                    <span className="block text-2xl font-semibold text-brand-900">
                      {money(need.averageCents)}
                    </span>
                    <span className="text-sm text-slate-600">average per student</span>
                  </span>
                </li>
              </ul>
            </div>
          ) : (
            <div className="p-6 sm:p-8">
              <h2 id="need-heading" className="text-2xl font-semibold text-brand-900">
                Every confirmed bill is funded right now.
              </h2>
              <p className="mt-2 max-w-2xl text-slate-700">
                New bills arrive as schools confirm them. Partner with us now and your
                support will be ready for next term&apos;s students.
              </p>
            </div>
          )}
        </section>

        {stats.raisedCents > 0 && (
          <section className="reveal mt-10 text-center" aria-label="Our record so far">
            <p className="text-sm font-semibold tracking-wider text-slate-500 uppercase">
              So far, donors have
            </p>
            <div className="mt-3 flex flex-wrap items-baseline justify-center gap-x-10 gap-y-3 text-slate-700">
              <p>
                paid <strong className="text-2xl text-brand-800"><CountUp value={stats.raisedCents} format="money" /></strong> in fees
              </p>
              <p>
                for <strong className="text-2xl text-brand-800"><CountUp value={stats.studentsSupported} /></strong>{" "}
                {stats.studentsSupported === 1 ? "student" : "students"}
              </p>
              <p>
                at <strong className="text-2xl text-brand-800"><CountUp value={stats.verifiedSchools} /></strong> verified{" "}
                {stats.verifiedSchools === 1 ? "school" : "schools"}
              </p>
            </div>
          </section>
        )}
      </div>

      <section className="mx-auto max-w-6xl px-4 py-20" aria-labelledby="why-heading">
        <div className="reveal max-w-2xl">
          <p className="text-sm font-semibold tracking-wider text-gold-700 uppercase">
            Why leaders give through CoveredNow
          </p>
          <h2 id="why-heading" className="mt-1 text-3xl font-semibold text-slate-900 sm:text-4xl">
            Philanthropy with proof built in
          </h2>
          <p className="mt-3 text-slate-600">
            The hardest part of giving at scale is knowing it landed. Here, that check
            is part of how every bill works.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="reveal group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl motion-reduce:hover:translate-y-0"
            >
              <span className="grid size-12 place-items-center rounded-2xl metal-graphite text-gold-300 shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 motion-reduce:transform-none">
                <pillar.icon className="size-6" aria-hidden />
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">{pillar.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="csr"
        className="relative isolate scroll-mt-20 overflow-hidden bg-brand-950 text-white"
        aria-labelledby="csr-heading"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 lg:grid-cols-2">
          <div className="reveal">
            <p className="text-sm font-semibold tracking-wider text-gold-300 uppercase">
              Corporate social responsibility
            </p>
            <h2 id="csr-heading" className="mt-1 text-3xl font-semibold sm:text-4xl">
              A CSR programme your board can verify
            </h2>
            <p className="mt-3 text-brand-50/85">
              Education is one of the most lasting investments a business can make in
              the communities it serves. CoveredNow turns that commitment into specific,
              confirmed students and records you can stand behind.
            </p>
            <ul className="mt-8 space-y-4">
              {CSR_POINTS.map((point) => (
                <li key={point.text} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-gold-400 ring-1 ring-white/15">
                    <point.icon className="size-5" aria-hidden />
                  </span>
                  <span className="pt-2 text-brand-50">{point.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal relative">
            <div
              aria-hidden
              className="absolute -top-5 -right-5 size-40 rounded-3xl bg-gold-500/30"
            />
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
              <Image
                src={teacherClass}
                alt="A teacher leading a lesson in a classroom"
                fill
                placeholder="blur"
                sizes="(min-width: 1024px) 34rem, 100vw"
                className="object-cover"
              />
            </div>
            <div className="bob absolute -bottom-6 left-6 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-slate-900 shadow-xl">
              <span className="grid size-10 place-items-center rounded-full metal-champagne">
                <Building2 className="size-5" aria-hidden />
              </span>
              <span className="text-sm leading-tight">
                <span className="block font-semibold">Your name, or none</span>
                <span className="text-slate-600">credited your way</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20" aria-labelledby="ways-heading">
        <div className="reveal max-w-2xl">
          <p className="text-sm font-semibold tracking-wider text-gold-700 uppercase">
            Ways to give
          </p>
          <h2 id="ways-heading" className="mt-1 text-3xl font-semibold text-slate-900 sm:text-4xl">
            Start with one student, or a whole school
          </h2>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <div className="reveal card flex flex-col gap-3 p-6">
            <UsersRound className="size-8 text-brand-700" aria-hidden />
            <h3 className="text-xl font-semibold text-slate-900">Clear a student&apos;s term</h3>
            <p className="text-sm text-slate-600">
              Choose a confirmed bill and pay it in full today, online.
              {need.averageCents > 0 && ` Bills average ${money(need.averageCents)}.`}
            </p>
            <Link href="/browse" className="btn-secondary mt-auto">
              Browse open bills
            </Link>
          </div>
          <div className="reveal card flex flex-col gap-3 p-6">
            <School className="size-8 text-brand-700" aria-hidden />
            <h3 className="text-xl font-semibold text-slate-900">Adopt a school</h3>
            <p className="text-sm text-slate-600">
              Cover every open bill at one school, and work with us to support its
              students term after term.
            </p>
            <a href="#enquire" className="btn-secondary mt-auto">
              Talk to us
            </a>
          </div>
          <div className="reveal relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-950 p-6 text-white shadow-xl">
            <span className="chip absolute top-4 right-4 metal-champagne">
              For CSR budgets
            </span>
            <Building2 className="size-8 text-gold-400" aria-hidden />
            <h3 className="text-xl font-semibold">Run a programme</h3>
            <p className="text-sm text-brand-50/85">
              Set a budget and a focus, such as a region, school level or field of study.
              We match it to confirmed bills and agree with you how to report on it.
            </p>
            <a href="#enquire" className={`${heroButton} mt-auto`}>
              Plan a programme
            </a>
          </div>
        </div>

        {need.openBills > 0 && (
          <div className="reveal mt-12 grid items-center gap-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 lg:grid-cols-2">
            <div>
              <h3 className="text-2xl font-semibold text-slate-900">See what your budget does</h3>
              <p className="mt-2 text-slate-600">
                For many students, an unpaid fee balance is what stands between them and
                the exam room. Clearing it takes one decision.
              </p>
            </div>
            <ImpactCalculator averageCents={need.averageCents} openBills={need.openBills} />
          </div>
        )}
      </section>

      <section className="border-y border-slate-200 bg-white" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <h2 id="faq-heading" className="reveal text-center text-3xl font-semibold text-slate-900">
            Questions partners ask
          </h2>
          <div className="mt-8 space-y-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="reveal group rounded-2xl border border-slate-200 bg-slate-50/60 transition-colors open:border-brand-200 open:bg-white open:shadow-md"
              >
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <ChevronDown
                    className="size-5 shrink-0 text-brand-700 transition-transform duration-300 group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section
        id="enquire"
        className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-20"
        aria-labelledby="enquire-heading"
      >
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="reveal">
            <p className="text-sm font-semibold tracking-wider text-gold-700 uppercase">
              Let&apos;s talk
            </p>
            <h2 id="enquire-heading" className="mt-1 text-3xl font-semibold text-slate-900 sm:text-4xl">
              Plan your impact with us
            </h2>
            <p className="mt-3 text-slate-600">
              Tell us a little about what you have in mind. We&apos;ll come back with
              confirmed bills that match your focus and a simple way to pay.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              {[
                "Bills matched to your regions, levels or causes",
                "Payment straight to each school's account",
                "A receipt and reference for every gift",
              ].map((line) => (
                <li key={line} className="flex gap-2">
                  <ShieldCheck className="size-5 shrink-0 text-brand-700" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal card relative p-6 shadow-xl shadow-brand-950/5 sm:p-8">
            <EnquiryForm />
          </div>
        </div>
      </section>
    </main>
  );
}
