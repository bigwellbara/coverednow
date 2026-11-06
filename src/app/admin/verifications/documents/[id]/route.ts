import { getVerificationService } from "@/modules/identity";
import { currentUser } from "@/modules/identity/adapters/session";

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (user?.role !== "ADMIN") return notFound();

  const { id } = await params;
  const document = await getVerificationService().readDocumentForReview(
    id,
    user.id,
  );
  if (!document) return notFound();

  return new Response(Buffer.from(document.bytes), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
