import { CircleAlert, CircleCheck, Clock, FileCheck } from "lucide-react";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
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
    info: "bg-sky-50 text-sky-900",
    good: "bg-emerald-50 text-emerald-900",
    warn: "bg-amber-50 text-amber-900",
  };
  return (
    <div className={`flex gap-3 rounded-xl p-4 ${tones[props.tone]}`}>
      <span className="shrink-0">{props.icon}</span>
      <div>
        <p className="font-semibold">{props.title}</p>
        <p className="mt-1 text-sm">{props.children}</p>
      </div>
    </div>
  );
}

export default async function OnboardingPage() {
  const applicant = await requireApplicant();
  const overview = await getVerificationService().overview(applicant);
  const { stage, editable, student, documents, missing } = overview;
  const isGuardian = applicant.role === "GUARDIAN";
  const iconClass = "size-5";

  return (
    <>
      <AppHeader name={applicant.name} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold">Verify your account</h1>

        {stage === "DRAFT" && (
          <p className="text-slate-600">
            Before a fee bill can be listed, we check who you are. Only our review
            team can see these documents, and they are never shown to donors.
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
            You&apos;ll be able to submit a fee bill here once bill submission
            opens.
          </Banner>
        )}
        {stage === "REJECTED" && (
          <Banner
            tone="warn"
            title="We need you to fix something"
            icon={<CircleAlert className={iconClass} aria-hidden />}
          >
            {overview.rejectionReason} Please update your details or documents,
            then submit again.
          </Banner>
        )}

        <section className="card space-y-4" aria-labelledby="student-heading">
          <h2 id="student-heading" className="text-lg font-semibold">
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

        <section className="card space-y-4" aria-labelledby="documents-heading">
          <h2 id="documents-heading" className="text-lg font-semibold">
            Documents
          </h2>
          {documents.length > 0 && (
            <ul className="space-y-1">
              {documents.map((document) => (
                <li key={document.id} className="flex items-center gap-2 text-sm">
                  <FileCheck
                    className="size-4 shrink-0 text-emerald-700"
                    aria-hidden
                  />
                  {DOCUMENT_KIND_LABELS[document.kind]} uploaded
                </li>
              ))}
            </ul>
          )}
          {editable && (
            <div className="space-y-6">
              {documentRequirements(applicant.role).map((requirement) => {
                const isMissing = missing.some((m) => m.id === requirement.id);
                return (
                  <div key={requirement.id} className="space-y-3">
                    <h3 className="font-medium">
                      {requirement.label}
                      {!isMissing && (
                        <span className="ml-2 text-sm font-normal text-slate-500">
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
          <SubmitForm canSubmit={missing.length === 0 && student !== null} />
        )}
      </main>
    </>
  );
}
