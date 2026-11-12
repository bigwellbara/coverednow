import { Check, CircleAlert, CircleCheck, Clock, FileCheck, Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHero } from "@/components/page-hero";
import { delay, stagger } from "@/lib/motion";
import { getVerificationService } from "@/modules/identity";
import { requireApplicant } from "@/modules/identity/adapters/session";
import {
  DOCUMENT_KIND_LABELS,
  documentRequirements,
} from "@/modules/identity/domain/verification";
import { DocumentUploadForm, StudentDetailsForm, SubmitForm } from "./forms";

function Banner(props: {
  icon: ReactNode;
  title: string;
  tone: "info" | "good" | "warn";
  children: ReactNode;
}) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    good: "border-brand-200 bg-brand-50 text-brand-900",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
  };
  return (
    <div className={`fade-up flex gap-3 rounded-2xl border p-4 ${tones[props.tone]}`} style={delay(200)}>
      <span className="pop-in shrink-0" style={delay(350)}>
        {props.icon}
      </span>
      <div>
        <p className="font-semibold">{props.title}</p>
        <p className="mt-1 text-sm">{props.children}</p>
      </div>
    </div>
  );
}

const STEPS = ["Your details", "Documents", "Review", "Verified"];

function Stepper({ current }: { current: number }) {
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Verification progress">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="fade-up space-y-2" style={stagger(index, 90, 300)}>
            <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-white/15">
              <span
                className={`grow-bar block h-full rounded-full ${
                  done ? "w-full bg-gold-400" : active ? "w-1/2 bg-gold-400/70" : "w-0"
                }`}
              />
            </span>
            <span
              className={`flex items-center gap-1.5 text-xs font-semibold sm:text-sm ${
                done || active ? "text-white" : "text-brand-100/60"
              }`}
            >
              {done && <Check className="size-3.5 shrink-0 text-gold-400" aria-hidden />}
              {label}
              <span className="sr-only">
                {done ? " (done)" : active ? " (current step)" : " (to come)"}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default async function OnboardingPage() {
  const applicant = await requireApplicant();
  const overview = await getVerificationService().overview(applicant);
  const { stage, editable, student, documents, missing } = overview;
  const isGuardian = applicant.role === "GUARDIAN";
  const iconClass = "size-5";

  const current =
    stage === "APPROVED"
      ? STEPS.length
      : stage === "IN_REVIEW"
        ? 2
        : student === null
          ? 0
          : missing.length > 0
            ? 1
            : 2;

  return (
    <main>
      <PageHero
        width="3xl"
        eyebrow="Verification"
        title="Verify your account"
        subtitle={
          stage === "DRAFT"
            ? "Before a fee bill can be listed, we check who you are."
            : undefined
        }
      >
        <Stepper current={current} />
      </PageHero>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        {stage === "DRAFT" && (
          <p className="fade-up flex gap-2 text-sm text-slate-600" style={delay(200)}>
            <Lock className="size-4 shrink-0 text-brand-700" aria-hidden />
            Only our review team can see these documents, and they are never shown to
            donors.
          </p>
        )}
        {stage === "IN_REVIEW" && (
          <Banner
            tone="info"
            title="We're reviewing your documents"
            icon={<Clock className={iconClass} aria-hidden />}
          >
            There&apos;s nothing more you need to do right now.
          </Banner>
        )}
        {stage === "APPROVED" && (
          <Banner
            tone="good"
            title="Your account is verified"
            icon={<CircleCheck className={iconClass} aria-hidden />}
          >
            <Link href="/bills" className="font-medium underline">
              Submit a fee bill
            </Link>
          </Banner>
        )}
        {stage === "REJECTED" && (
          <Banner
            tone="warn"
            title="We need you to fix something"
            icon={<CircleAlert className={iconClass} aria-hidden />}
          >
            {overview.rejectionReason} Please update your details or documents, then
            submit again.
          </Banner>
        )}

        <section
          className="fade-up card space-y-4 p-6"
          style={delay(300)}
          aria-labelledby="student-heading"
        >
          <h2 id="student-heading" className="flex items-center gap-3 text-lg font-semibold">
            <span className="grid size-8 place-items-center rounded-full bg-brand-700 text-sm font-semibold text-white">
              1
            </span>
            {isGuardian ? "The student in your care" : "Your student details"}
          </h2>
          {editable ? (
            <StudentDetailsForm
              defaults={student}
              levelLabel={isGuardian ? "Form or grade" : "Year of study"}
              levelPlaceholder={isGuardian ? "Form 3" : "Year 2"}
            />
          ) : (
            student && (
              <p className="text-slate-700">
                {student.firstName} {student.lastName}, {student.level}
              </p>
            )
          )}
        </section>

        <section
          className="fade-up card space-y-4 p-6"
          style={delay(400)}
          aria-labelledby="documents-heading"
        >
          <h2 id="documents-heading" className="flex items-center gap-3 text-lg font-semibold">
            <span className="grid size-8 place-items-center rounded-full bg-brand-700 text-sm font-semibold text-white">
              2
            </span>
            Documents
          </h2>
          {documents.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {documents.map((document) => (
                <li key={document.id} className="chip bg-brand-50 px-3 py-1 text-brand-800">
                  <FileCheck className="size-3.5 shrink-0" aria-hidden />
                  {DOCUMENT_KIND_LABELS[document.kind]} uploaded
                </li>
              ))}
            </ul>
          )}
          {editable && (
            <div className="space-y-4">
              {documentRequirements(applicant.role).map((requirement) => {
                const isMissing = missing.some((m) => m.id === requirement.id);
                return (
                  <div
                    key={requirement.id}
                    className={`space-y-3 rounded-xl border p-4 transition-colors ${
                      isMissing ? "border-dashed border-slate-300" : "border-brand-200 bg-brand-50/40"
                    }`}
                  >
                    <h3 className="flex flex-wrap items-center gap-2 font-medium">
                      {!isMissing && (
                        <CircleCheck className="size-4 text-brand-700" aria-hidden />
                      )}
                      {requirement.label}
                      {!isMissing && (
                        <span className="text-sm font-normal text-slate-500">
                          (done, upload again to replace)
                        </span>
                      )}
                    </h3>
                    <DocumentUploadForm requirement={requirement} />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {editable && (
          <div className="fade-up" style={delay(500)}>
            <SubmitForm canSubmit={missing.length === 0 && student !== null} />
          </div>
        )}
      </div>
    </main>
  );
}
