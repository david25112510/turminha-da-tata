import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyCredentials } from "@/lib/verify-credentials";
import { isRateLimited, recordFailedAttempt, resetAttempts } from "@/lib/rate-limit";
import { checkMfaRequirement } from "@/lib/mfa";
import { prisma } from "@/lib/prisma";

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
        totpCode: { label: "Código de autenticação", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const totpCode = credentials?.totpCode as string | undefined;

        if (email && (await isRateLimited(email))) return null;

        const user = await verifyCredentials(email, password);
        if (!user) {
          if (email) await recordFailedAttempt(email);
          return null;
        }

        // MFA só para ADMIN, e só quando a conta tiver o TOTP habilitado (ver /admin/configuracoes).
        // Nunca confia no pré-check de src/app/login/actions.ts — esta é a barreira real, alcançada
        // por qualquer caminho de login, não só pelo formulário.
        if (!(await checkMfaRequirement(user.id, user.role, totpCode))) {
          await recordFailedAttempt(email!);
          return null;
        }

        await resetAttempts(email!);
        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});
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
