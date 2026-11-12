import { NextResponse, type NextRequest } from "next/server";
import { getEngagementService } from "@/modules/engagement";
import { giftsToCsv } from "@/modules/engagement/domain/giving";
import { currentUser } from "@/modules/identity/adapters/session";
import { reportRange } from "../range";

/** The signed-in donor's settled gifts for a date range, as a spreadsheet. */
export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user) return new NextResponse("Please sign in.", { status: 401 });

  const range = reportRange({
    from: request.nextUrl.searchParams.get("from"),
    to: request.nextUrl.searchParams.get("to"),
  });
  if (!range.valid) return new NextResponse("Invalid dates.", { status: 400 });

  const gifts = await getEngagementService().donorGifts(user.id, { from: range.start, to: range.end });
  return new NextResponse(giftsToCsv(gifts), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="coverednow-gifts-${range.from}-to-${range.to}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
