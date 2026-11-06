import NextAuth from "next-auth";
import { authOptions } from "@/modules/identity/adapters/session";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
