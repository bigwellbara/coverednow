import { CircleAlert, CircleCheck, Clock, GraduationCap } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
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

function Message(props: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="card flex gap-3">
      <span className="shrink-0">{props.icon}</span>
      <div>
        <h1 className="font-semibold">{props.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{props.children}</p>
      </div>
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
  const iconClass = "size-5";

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <p className="flex items-center gap-2 font-semibold">
        <GraduationCap className="size-5 text-emerald-700" aria-hidden />
        CoveredNow
      </p>

      {view.state === "INVALID" && (
        <Message
          title="This link isn't valid"
          icon={<CircleAlert className={`${iconClass} text-amber-700`} aria-hidden />}
        >
          Please use the exact link we sent you, or contact CoveredNow for a new one.
        </Message>
      )}
      {view.state === "EXPIRED" && (
        <Message
          title="This link has expired"
          icon={<Clock className={`${iconClass} text-amber-700`} aria-hidden />}
        >
          Please contact CoveredNow for a new one.
        </Message>
      )}
      {view.state === "ANSWERED" && (
        <Message
          title="This bill has been answered"
          icon={<CircleCheck className={`${iconClass} text-emerald-700`} aria-hidden />}
        >
          Thank you. There&apos;s nothing more you need to do.
        </Message>
      )}

      {view.state === "OPEN" && (
        <>
          <div>
            <h1 className="text-2xl font-bold">Please confirm this fee bill</h1>
            <p className="mt-1 text-slate-600">
              For {view.schoolName}. Sent to {view.contactName}.
            </p>
          </div>

          <section className="card">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-500">Student</dt>
              <dd className="font-medium">
                {view.student.firstName} {view.student.lastName}
              </dd>
              <dt className="text-slate-500">Level</dt>
              <dd>{view.student.level}</dd>
              <dt className="text-slate-500">Reg number</dt>
              <dd>{view.regNumber}</dd>
              <dt className="text-slate-500">Term</dt>
              <dd>{termLabel(view.term)}</dd>
              <dt className="text-slate-500">Amount claimed</dt>
              <dd className="font-medium">{formatMoney(view.claimedCents)}</dd>
            </dl>
          </section>

          <section className="card">
            <ConfirmationForms
              token={decodeURIComponent(token)}
              claimedLabel={formatMoney(view.claimedCents)}
            />
          </section>

          <p className="text-sm text-slate-500">
            Only the amount you confirm is shown to donors, and any money raised is
            paid to the school&apos;s registered account.
          </p>
        </>
      )}
    </main>
  );
}
