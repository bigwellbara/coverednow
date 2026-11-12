import { SHARE_CARD_SIZE, shareCard } from "@/lib/share-card";
import { getBillService } from "@/modules/billing";
import { termLabel } from "@/modules/billing/domain/bill";
import { formatMoney } from "@/modules/billing/domain/money";
import { percentFunded, remainingCents } from "@/modules/billing/domain/public-bill";

export const size = SHARE_CARD_SIZE;
export const contentType = "image/png";
export const alt = "A school-confirmed fee bill on CoveredNow";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const bill = await getBillService().findPublic((await params).id);
  if (!bill) {
    return shareCard({ eyebrow: "CoveredNow", title: "School fees, covered", detail: "", percent: null });
  }
  const percent = percentFunded(bill);
  const remaining = remainingCents(bill);
  return shareCard({
    eyebrow: `${bill.schoolName} · ${bill.city}`,
    title: `Help ${bill.studentInitials} cover ${termLabel(bill.term)} fees`,
    detail: `${bill.studentLevel} · ${percent}% funded`,
    figure: remaining > 0 ? `${formatMoney(remaining)} still needed` : "Fully funded. Thank you!",
    percent,
  });
}
