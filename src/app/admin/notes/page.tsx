import { MessageSquareHeart, PartyPopper } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/format";
import { stagger } from "@/lib/motion";
import { termLabel } from "@/modules/billing/domain/bill";
import { getEngagementService } from "@/modules/engagement";
import { requireAdmin } from "@/modules/identity/adapters/session";
import { AdminHeader } from "../admin-header";
import { ReviewNoteForm } from "../engagement-forms";

export const dynamic = "force-dynamic";

export default async function NotesQueuePage() {
  await requireAdmin();
  const notes = await getEngagementService().pendingNotes();

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <AdminHeader
        title="Thank-you notes"
        icon={<MessageSquareHeart className="size-5" aria-hidden />}
        meta={notes.length === 1 ? "1 waiting for review" : `${notes.length} waiting for review`}
      />
      <p className="text-sm text-slate-600">
        Approved notes appear on the bill page and are sent to every donor by WhatsApp or
        email. Don&apos;t approve anything with full names, contact or bank details, or
        requests for money.
      </p>
      {notes.length === 0 ? (
        <EmptyState icon={PartyPopper} title="All caught up">
          No notes are waiting.
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {notes.map((note, index) => (
            <li key={note.id} className="fade-up card space-y-3" style={stagger(index)}>
              <p className="text-sm text-slate-500">
                {note.bill ? (
                  <Link href={`/admin/bills/${note.billId}`} className="font-medium text-brand-800 underline">
                    {note.bill.schoolName}, {termLabel(note.bill.term)} · {note.bill.studentInitials}
                  </Link>
                ) : (
                  "Bill no longer public"
                )}{" "}
                · {formatDate(note.createdAt)}
              </p>
              <blockquote className="rounded-xl bg-slate-50 p-4 whitespace-pre-line text-slate-800">
                {note.body}
              </blockquote>
              <ReviewNoteForm noteId={note.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
