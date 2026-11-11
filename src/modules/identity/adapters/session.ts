import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { homePathFor, isApplicantRole, type ApplicantRole } from "../domain/account";
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
        address: { type: "text" },
        code: { type: "text" },
        name: { type: "text" },
        role: { type: "text" },
      },
      async authorize(credentials) {
        const { address = "", code = "", name, role } = credentials ?? {};
        const result = await getAccountService().signIn({
          address,
          code,
          signUp: role === undefined ? undefined : { name, role },
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
  phone: string | null;
  email: string | null;
  role: string;
};

/**
 * Reads the user fresh from the database, not the session token, so a role
 * change or removal takes effect at once rather than when the token expires.
 * Cached for one request, as the header and the page both ask.
 */
export const currentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getServerSession(authOptions);
  const id = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!id) return null;
  return db.user.findUnique({
    where: { id },
    select: { id: true, name: true, phone: true, email: true, role: true },
  });
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function requireApplicant(): Promise<
  CurrentUser & { role: ApplicantRole }
> {
  const user = await requireUser();
  if (!isApplicantRole(user.role)) redirect(homePathFor(user.role));
  return { ...user, role: user.role };
}

/** Non-admins get a plain 404, so the admin area does not advertise itself. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await currentUser();
  if (user?.role !== "ADMIN") notFound();
  return user;
}
