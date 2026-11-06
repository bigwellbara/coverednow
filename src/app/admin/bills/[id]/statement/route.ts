import { getBillService } from "@/modules/billing";
import { currentUser } from "@/modules/identity/adapters/session";

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (user?.role !== "ADMIN") return notFound();

  const { id } = await params;
  const statement = await getBillService().readStatementForAdmin(id, user.id);
  if (!statement?.mimeType) return notFound();

  return new Response(Buffer.from(statement.bytes), {
    headers: {
      "Content-Type": statement.mimeType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
