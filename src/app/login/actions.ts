"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rate-limit";

const HOME_BY_ROLE: Record<string, string> = {
  ADMIN: "/admin",
  CAREGIVER: "/cuidadora",
  GUARDIAN: "/pais",
};

export async function loginAction(
  _prevState: { error?: string; mfaRequired?: boolean } | undefined,
  formData: FormData
) {
  const email = String(formData.get("email") ?? "");
  const password = formData.get("password");
  const totpCode = String(formData.get("totpCode") ?? "").trim();

  // Enforcement (recording attempts, resetting on success) happens inside
  // auth.ts's authorize(), since that's reached by every sign-in path, not
  // just this form. This is only a pre-check for a friendlier message.
  if (await isRateLimited(email)) {
    return { error: "Muitas tentativas de login. Tente novamente em alguns minutos." };
  }

  // Mesmo raciocínio para MFA: só decide se mostra o segundo passo (código do app autenticador)
  // antes de tentar autenticar de verdade — a exigência real está dentro de authorize(), que nunca
  // confia neste pré-check. Sem efeito colateral (não conta como tentativa falha) e só roda a
  // segunda checagem de senha (bcrypt) quando já sabe que a conta é ADMIN com MFA ligado, para não
  // pagar esse custo em todo login de cuidadora/responsável.
  if (!totpCode) {
    const account = await prisma.user.findUnique({
      where: { email },
      select: { role: true, totpEnabled: true, passwordHash: true, active: true },
    });
    if (account?.active && account.role === "ADMIN" && account.totpEnabled && password) {
      const passwordMatches = await bcrypt.compare(String(password), account.passwordHash);
      if (passwordMatches) return { mfaRequired: true };
    }
  }

  try {
    await signIn("credentials", { email, password, totpCode, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-mail ou senha inválidos." };
    }
    throw error;
  }

  // auth() lido logo em seguida, na mesma execução do Server Action, não enxerga a sessão que
  // signIn() acabou de gravar (o cookie de sessão ainda não está visível para uma releitura dentro
  // do mesmo request) — isso fazia todo login válido cair de volta em "/login". As credenciais já
  // foram validadas por signIn() não ter lançado erro; só falta saber o papel para redirecionar.
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, guardian: { select: { _count: { select: { children: true } } } } },
  });
  if (user?.role === "GUARDIAN" && user.guardian?._count.children === 0) redirect("/matricula");
  redirect(HOME_BY_ROLE[user?.role ?? ""] ?? "/login");
}
