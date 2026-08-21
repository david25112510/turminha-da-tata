"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { isRateLimited } from "@/lib/rate-limit";

const HOME_BY_ROLE: Record<string, string> = {
  ADMIN: "/admin",
  CAREGIVER: "/cuidadora",
  GUARDIAN: "/pais",
};

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const email = String(formData.get("email") ?? "");
  const password = formData.get("password");

  // Enforcement (recording attempts, resetting on success) happens inside
  // auth.ts's authorize(), since that's reached by every sign-in path, not
  // just this form. This is only a pre-check for a friendlier message.
  if (isRateLimited(email)) {
    return { error: "Muitas tentativas de login. Tente novamente em alguns minutos." };
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-mail ou senha inválidos." };
    }
    throw error;
  }

  const session = await auth();
  redirect(HOME_BY_ROLE[session?.user.role ?? ""] ?? "/login");
}
