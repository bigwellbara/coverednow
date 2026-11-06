import { ArrowLeft, CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BILLER_ERROR_MESSAGES, getBillerService } from "@/modules/billing";
import { requireAdmin } from "@/modules/identity/adapters/session";
import {
  AddContactForm,
  PayoutForm,
  RemoveContactForm,
  SchoolDetailsForm,
  SchoolVerificationForm,
  VerifyContactForm,
} from "../forms";

export default async function SchoolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const school = await getBillerService().getForAdmin(id);
  if (!school) notFound();

  const canVerify = school.blockers.length === 0;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link
        href="/admin/schools"
        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-emerald-800"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to schools
      </Link>
      <h1 className="text-2xl font-bold">{school.name}</h1>

      <section className="card space-y-3" aria-labelledby="status-heading">
        <h2 id="status-heading" className="flex items-center gap-2 font-semibold">
          {school.verified ? (
            <>
              <CircleCheck className="size-5 text-emerald-700" aria-hidden />
              Verified
            </>
          ) : (
            <>
              <CircleAlert className="size-5 text-amber-700" aria-hidden />
              Not verified
            </>
          )}
        </h2>
        {!school.verified && (
          <p className="text-sm text-slate-600">
            Students can&apos;t choose this school until it is verified.
          </p>
        )}
        {school.blockers.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {school.blockers.map((blocker) => (
              <li key={blocker}>{BILLER_ERROR_MESSAGES[blocker]}</li>
            ))}
          </ul>
        )}
        {(school.verified || canVerify) && (
          <SchoolVerificationForm schoolId={id} verified={school.verified} />
        )}
      </section>

      <section className="card space-y-4" aria-labelledby="details-heading">
        <h2 id="details-heading" className="font-semibold">
          School details
        </h2>
        <SchoolDetailsForm
          schoolId={id}
          defaults={{ name: school.name, type: school.type, city: school.city }}
        />
      </section>

      <section className="card space-y-4" aria-labelledby="contacts-heading">
        <h2 id="contacts-heading" className="font-semibold">
          Contacts
        </h2>
        <p className="text-sm text-slate-600">
          Check each person against the school&apos;s official website or
          letterhead. Only verified contacts will receive bill confirmation links.
        </p>

        {school.contacts.length > 0 && (
          <ul className="divide-y divide-slate-200">
            {school.contacts.map((contact) => (
              <li key={contact.id} className="space-y-3 py-4">
                <div>
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-slate-600">
                    {contact.roleTitle}, {contact.phone}
                    {contact.email ? `, ${contact.email}` : ""}
                  </p>
                  {contact.verifiedAt ? (
                    <p className="mt-1 flex items-start gap-1 text-sm text-emerald-800">
                      <CircleCheck
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                      <span>
                        Verified {contact.verifiedAt.toISOString().slice(0, 10)}:{" "}
                        {contact.verificationNote}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-amber-800">Not verified</p>
                  )}
                </div>
                {!contact.verifiedAt && (
                  <VerifyContactForm schoolId={id} contactId={contact.id} />
                )}
                <RemoveContactForm schoolId={id} contactId={contact.id} />
              </li>
            ))}
          </ul>
        )}

        <h3 className="font-medium">Add a contact</h3>
        <AddContactForm schoolId={id} />
      </section>

      <section className="card space-y-4" aria-labelledby="payout-heading">
        <h2 id="payout-heading" className="font-semibold">
          Payout details
        </h2>
        <p className="text-sm text-slate-600">
          {school.payoutSummary ?? "None saved yet."}
        </p>
        <PayoutForm schoolId={id} replacing={school.hasPayoutDetails} />
      </section>
    </main>
  );
}
