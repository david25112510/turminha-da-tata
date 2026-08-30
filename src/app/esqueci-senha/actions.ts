"use server";

import { prisma } from "@/lib/prisma";
import { isRateLimited, recordFailedAttempt } from "@/lib/rate-limit";
import { createPasswordResetToken } from "@/lib/password-reset";
import { sendEmail } from "@/lib/email";
import { TURNSTILE_FIELD, turnstileError, verifyTurnstileToken } from "@/lib/turnstile";

const GENERIC_MESSAGE = "Se este e-mail estiver cadastrado, enviamos instruções de recuperação para ele.";

export async function requestPasswordResetAction(
  _prevState: { message?: string; error?: string } | undefined,
  formData: FormData
): Promise<{ message?: string; error?: string } | undefined> {
  if (!(await verifyTurnstileToken(formData.get(TURNSTILE_FIELD)))) return turnstileError();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Informe um e-mail." };

  // Same rate-limit primitive login uses, keyed separately so a burst of reset requests can't also
  // lock the person out of signing in.
  const key = `reset:${email}`;
  if (await isRateLimited(key)) {
    return { error: "Muitos pedidos de recuperação. Tente novamente em alguns minutos." };
  }
  await recordFailedAttempt(key);

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, active: true } });

  // Always the same response whether or not the user exists — avoids leaking which e-mails are registered.
  if (user && user.active) {
    const token = await createPasswordResetToken(user.id);
    const resetUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/redefinir-senha?token=${token}`;

    await sendEmail({
      to: email,
      subject: "Recuperação de senha — Turminha da Tata",
      html: `
        <p>Olá, ${user.name}.</p>
        <p>Recebemos um pedido para redefinir sua senha na Turminha da Tata.</p>
        <p><a href="${resetUrl}">Clique aqui para escolher uma nova senha</a>. O link expira em 1 hora.</p>
        <p>Se você não pediu isso, pode ignorar este e-mail.</p>
      `,
    });
  }

  return { message: GENERIC_MESSAGE };
}
