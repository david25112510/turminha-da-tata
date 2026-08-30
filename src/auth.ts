import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyCredentials } from "@/lib/verify-credentials";
import { isRateLimited, recordFailedAttempt, resetAttempts } from "@/lib/rate-limit";
import { checkMfaRequirement } from "@/lib/mfa";
import { prisma } from "@/lib/prisma";
import { verifyTurnstileToken } from "@/lib/turnstile";

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
        turnstileToken: { label: "Verificacao humana", type: "text" },
        totpCode: { label: "Código de autenticação", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const totpCode = credentials?.totpCode as string | undefined;
        const turnstileToken = credentials?.turnstileToken as string | undefined;

        if (!(await verifyTurnstileToken(turnstileToken ?? null))) return null;

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
        return token;
      }

      // JWTs emitidos anteriormente não podem manter acesso depois que a conta é desativada,
      // removida ou tem o papel alterado. Como este sistema trata dados de crianças, a revogação
      // efetiva tem prioridade sobre evitar esta consulta indexada por id em requisições autenticadas.
      if (token.id) {
        const currentUser = await prisma.user.findUnique({
          where: { id: String(token.id) },
          select: { id: true, role: true, active: true },
        });

        if (!currentUser?.active) {
          delete token.id;
          delete token.role;
          delete token.sub;
          return token;
        }

        // Não confia indefinidamente no role gravado no JWT: uma alteração administrativa passa a
        // valer na próxima leitura da sessão, evitando privilégios antigos até o token expirar.
        token.role = currentUser.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (!token.id || !token.role) {
          // Mantém a sessão estruturalmente válida para o Auth.js, mas sem identidade autorizável.
          // Todas as áreas protegidas já exigem id + role e, portanto, negarão o acesso.
          delete (session.user as { id?: string }).id;
          delete (session.user as { role?: string }).role;
          return session;
        }
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "CAREGIVER" | "GUARDIAN";
      }
      return session;
    },
  },
});
