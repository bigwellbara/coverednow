import { CircleAlert, CircleCheck, Clock, Landmark, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHero } from "@/components/page-hero";
import { delay } from "@/lib/motion";
import { getBillService } from "@/modules/billing";
import { termLabel } from "@/modules/billing/domain/bill";
import { formatMoney } from "@/modules/billing/domain/money";
import { ConfirmationForms } from "./forms";

// The address is a credential, so keep it out of search engines and referrers.
export const metadata: Metadata = {
  title: "Confirm a fee bill - CoveredNow",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function Message(props: { icon: ReactNode; tone: string; title: string; children: ReactNode }) {
  return (
    <section className="fade-up card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className={`pop-in grid size-16 place-items-center rounded-full ${props.tone}`} style={delay(150)}>
        {props.icon}
      </span>
      <h1 className="text-xl font-semibold text-slate-900">{props.title}</h1>
      <p className="max-w-sm text-sm text-slate-600">{props.children}</p>
    </section>
  );
}

export default async function ConfirmBillPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const view = await getBillService().viewConfirmation(decodeURIComponent(token));
  const iconClass = "size-8";

  if (view.state !== "OPEN") {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        {view.state === "INVALID" && (
          <Message
            title="This link isn't valid"
            tone="bg-amber-50 text-amber-700"
            icon={<CircleAlert className={iconClass} aria-hidden />}
          >
            Please use the exact link we sent you, or contact CoveredNow for a new one.
          </Message>
        )}
        {view.state === "EXPIRED" && (
          <Message
            title="This link has expired"
            tone="bg-amber-50 text-amber-700"
            icon={<Clock className={iconClass} aria-hidden />}
          >
            Please contact CoveredNow for a new one.
          </Message>
        )}
        {view.state === "ANSWERED" && (
          <Message
            title="This bill has been answered"
            tone="bg-brand-50 text-brand-700"
            icon={<CircleCheck className={iconClass} aria-hidden />}
          >
            Thank you. There&apos;s nothing more you need to do.
          </Message>
        )}
      </main>
    );
  }

  const rows: Array<[string, ReactNode]> = [
    ["Student", `${view.student.firstName} ${view.student.lastName}`],
    ["Level", view.student.level],
    ["Reg number", view.regNumber],
    ["Term", termLabel(view.term)],
  ];

  return (
    <main>
      <PageHero
        width="3xl"
        overlap
        eyebrow={`For ${view.schoolName}`}
        title="Please confirm this fee bill"
        subtitle={`Sent to ${view.contactName}. It takes one tap.`}
      />

      <div className="mx-auto max-w-xl space-y-6 px-4">
        <section
          className="fade-up card relative -mt-14 overflow-hidden p-0 shadow-xl shadow-brand-950/10"
          style={delay(300)}
          aria-label="The bill"
        >
          <dl className="divide-y divide-slate-100 px-5 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-3">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex items-baseline justify-between gap-4 bg-gradient-to-r from-brand-50 to-gold-50 px-5 py-4">
            <span className="text-sm font-medium text-slate-600">Amount claimed</span>
            <span className="text-3xl font-semibold tracking-tight text-brand-800">
              {formatMoney(view.claimedCents)}
            </span>
          </div>
        </section>

        <section className="fade-up card p-6" style={delay(400)}>
          <ConfirmationForms
            token={decodeURIComponent(token)}
            claimedLabel={formatMoney(view.claimedCents)}
          />
        </section>

        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <ShieldCheck className="size-4 shrink-0 text-brand-700" aria-hidden />
            Only the amount you confirm is shown to donors.
          </li>
          <li className="flex gap-2">
            <Landmark className="size-4 shrink-0 text-brand-700" aria-hidden />
            Any money raised is paid to the school&apos;s registered account.
          </li>
        </ul>
      </div>
    </main>
  );
}
