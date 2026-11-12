import { CircleCheck, KeyRound, Mail, MessageCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { delay } from "@/lib/motion";
import { getEngagementService } from "@/modules/engagement";
import { requireUser } from "@/modules/identity/adapters/session";
import { AddMethodForm } from "./add-method-form";
import { NotificationsSwitch } from "./notifications";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  STUDENT: "Student",
  GUARDIAN: "Parent or guardian",
  DONOR: "Donor",
};

function Method({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="block text-slate-500">{label}</span>
        <span className="block font-medium break-all text-slate-900">{value}</span>
      </span>
      <CircleCheck className="size-5 shrink-0 text-brand-600" aria-label="Verified" />
    </li>
  );
}

export default async function AccountPage() {
  const user = await requireUser();
  const notificationsOn = await getEngagementService().notificationsOn(user.id);
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return (
    <main>
      <PageHero
        width="3xl"
        eyebrow="Your account"
        title={
          <span className="flex items-center gap-4">
            <span
              aria-hidden
              className="pop-in grid size-14 shrink-0 place-items-center rounded-2xl bg-gold-500 text-xl font-semibold text-brand-950 shadow-lg"
            >
              {initials || "?"}
            </span>
            <span className="min-w-0 break-words">{user.name}</span>
          </span>
        }
        subtitle={ROLE_LABELS[user.role]}
      />

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <section
          className="fade-up card space-y-4 p-6"
          style={delay(250)}
          aria-labelledby="methods-heading"
        >
          <h2 id="methods-heading" className="flex items-center gap-2 font-semibold">
            <KeyRound className="size-5 text-gold-600" aria-hidden />
            How you sign in
          </h2>
          <ul className="space-y-2">
            {user.phone && <Method icon={MessageCircle} label="WhatsApp" value={user.phone} />}
            {user.email && <Method icon={Mail} label="Email" value={user.email} />}
          </ul>

          {user.phone && user.email ? (
            <p className="text-sm text-slate-600">
              To change either of these, please contact support.
            </p>
          ) : (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-600">
                Add a second way to sign in, so you can still get in if you lose access to
                the first.
              </p>
              <AddMethodForm kind={user.email ? "PHONE" : "EMAIL"} />
            </div>
          )}
        </section>

        <section className="fade-up card p-6" style={delay(350)} aria-label="Notifications">
          <NotificationsSwitch on={notificationsOn} channel={user.phone ? "WhatsApp" : "email"} />
        </section>
      </div>
    </main>
  );
}
