import { redirect } from "next/navigation";
import { homePathFor } from "@/modules/identity/domain/account";
import { requireUser } from "@/modules/identity/adapters/session";

/** Where sign-in lands: sends each person on to the page for their role. */
export default async function DashboardPage() {
  const user = await requireUser();
  redirect(homePathFor(user.role));
}
