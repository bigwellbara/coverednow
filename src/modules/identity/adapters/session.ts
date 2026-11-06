import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isApplicantRole, type ApplicantRole } from "../domain/account";
import { getAccountService } from "../index";

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: SEVEN_DAYS_IN_SECONDS },
  pages: { signIn: "/sign-in" },
  callbacks: {
    session({ session, token }) {
      return { ...session, user: { ...session.user, id: token.sub } };
    },
  },
  providers: [
    CredentialsProvider({
      id: "phone-otp",
      name: "Phone",
      credentials: {
        phone: { type: "text" },
        code: { type: "text" },
        name: { type: "text" },
        email: { type: "text" },
        role: { type: "text" },
      },
      async authorize(credentials) {
        const { phone = "", code = "", name, email, role } = credentials ?? {};
        const result = await getAccountService().signIn({
          phone,
          code,
          signUp: role === undefined ? undefined : { name, email, role },
        });
        // NextAuth hands this message back to the sign-in form as the error code.
        if (!result.ok) throw new Error(result.error);
        return { id: result.account.id, name: result.account.name };
      },
    }),
  ],
};

export type CurrentUser = {
  id: string;
  name: string;
  phone: string;
  role: string;
};

/**
 * Reads the user fresh from the database, not the session token, so a role
 * change or removal takes effect at once rather than when the token expires.
 */
export async function currentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  const id = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!id) return null;
  return db.user.findUnique({
    where: { id },
    select: { id: true, name: true, phone: true, role: true },
  });
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function requireApplicant(): Promise<
  CurrentUser & { role: ApplicantRole }
> {
  const user = await requireUser();
  if (user.role === "ADMIN") redirect("/admin/verifications");
  if (!isApplicantRole(user.role)) redirect("/");
  return { ...user, role: user.role };
}

/** Non-admins get a plain 404, so the admin area does not advertise itself. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await currentUser();
  if (user?.role !== "ADMIN") notFound();
  return user;
}
