import { SHARE_CARD_SIZE, shareCard } from "@/lib/share-card";
import { getBillService } from "@/modules/billing";
import { termLabel } from "@/modules/billing/domain/bill";
import { formatMoney } from "@/modules/billing/domain/money";
import { percentFunded } from "@/modules/billing/domain/public-bill";
import { getPaymentService } from "@/modules/payments";

export const size = SHARE_CARD_SIZE;
export const contentType = "image/png";
export const alt = "A gift toward school fees on CoveredNow";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const gift = await getPaymentService().findPublicGift((await params).id);
  const bill = gift ? await getBillService().findPublic(gift.billId) : null;
  if (!gift || !bill) {
    return shareCard({ eyebrow: "CoveredNow", title: "School fees, covered", detail: "", percent: null });
  }
  return shareCard({
    eyebrow: `${bill.schoolName} · ${bill.city}`,
    title: `${gift.displayName ?? "Someone"} just covered ${formatMoney(gift.amountCents)} of school fees`,
    detail: `${termLabel(bill.term)} · ${bill.studentLevel}`,
    figure: `${percentFunded(bill)}% funded`,
    percent: percentFunded(bill),
  });
}
