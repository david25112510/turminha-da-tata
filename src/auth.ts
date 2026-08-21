import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyCredentials } from "@/lib/verify-credentials";
import { isRateLimited, recordFailedAttempt, resetAttempts } from "@/lib/rate-limit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (email && isRateLimited(email)) return null;

        const user = await verifyCredentials(email, password);
        if (!user) {
          if (email) recordFailedAttempt(email);
          return null;
        }

        resetAttempts(email!);
        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "CAREGIVER" | "GUARDIAN";
      }
      return session;
    },
  },
});
