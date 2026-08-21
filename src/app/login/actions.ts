"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";

const HOME_BY_ROLE: Record<string, string> = {
  ADMIN: "/admin",
  CAREGIVER: "/cuidadora",
  GUARDIAN: "/pais",
};

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const email = formData.get("email");
  const password = formData.get("password");

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
