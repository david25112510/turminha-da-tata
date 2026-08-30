"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isRateLimited, recordFailedAttempt } from "@/lib/rate-limit";
import { consumeGuardianInvite } from "@/lib/guardian-invite";
import { notifyAdmins } from "@/lib/notifications";
import { TURNSTILE_FIELD, turnstileError, verifyTurnstileToken } from "@/lib/turnstile";

const MIN_PASSWORD_LENGTH = 8;

export type SignupState = { success: true } | { error: string } | undefined;

/**
 * Nunca cria User diretamente — só registra a intenção (SignupRequest, PENDING). Vira conta de
 * verdade quando o admin aprova em /admin/solicitacoes (src/app/admin/solicitacoes/actions.ts).
 * Rate limit por e-mail (mesmo padrão do login, src/lib/rate-limit.ts) contra tentativas repetidas
 * de adivinhar um código de convite ou descobrir e-mails já cadastrados.
 */
export async function requestSignupAction(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  if (!(await verifyTurnstileToken(formData.get(TURNSTILE_FIELD)))) return turnstileError();
  const role = String(formData.get("role") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const cpf = String(formData.get("cpf") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const inviteCode = String(formData.get("inviteCode") ?? "").trim();
  const relationship = String(formData.get("relationship") ?? "");

  if (role !== "CAREGIVER" && role !== "GUARDIAN") {
    return { error: "Selecione se você é cuidadora ou responsável." };
  }
  if (!name || !email || !phone) return { error: "Nome, e-mail e telefone são obrigatórios." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "E-mail inválido." };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (password !== confirmPassword) return { error: "As senhas não conferem." };
  if (role === "GUARDIAN" && !inviteCode) {
    return { error: "Informe o código de convite fornecido pela escola." };
  }
  if (role === "GUARDIAN" && !relationship) {
    return { error: "Selecione seu parentesco com a criança." };
  }

  if (await isRateLimited(`signup:${email}`)) {
    return { error: "Muitas tentativas. Tente novamente em alguns minutos." };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    await recordFailedAttempt(`signup:${email}`);
    return { error: "Já existe uma conta com este e-mail." };
  }

  const existingRequest = await prisma.signupRequest.findFirst({ where: { email, status: "PENDING" } });
  if (existingRequest) {
    await recordFailedAttempt(`signup:${email}`);
    return { error: "Já existe uma solicitação pendente com este e-mail. Aguarde a análise da escola." };
  }

  let inviteId: string | undefined;
  if (role === "GUARDIAN") {
    const invite = await consumeGuardianInvite(inviteCode);
    if (!invite) {
      await recordFailedAttempt(`signup:${email}`);
      return { error: "Código de convite inválido, expirado ou já utilizado." };
    }
    inviteId = invite.id;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const request = await prisma.signupRequest.create({
    data: {
      role: role as "CAREGIVER" | "GUARDIAN",
      name,
      email,
      passwordHash,
      phone,
      cpf: cpf || null,
      inviteId,
      relationship: role === "GUARDIAN" ? (relationship as never) : null,
    },
  });

  await notifyAdmins(
    "SIGNUP_REQUEST",
    "Nova solicitação de cadastro",
    `${name} solicitou acesso como ${role === "CAREGIVER" ? "cuidadora" : "responsável"}.`,
    { entity: "SignupRequest", entityId: request.id }
  );

  return { success: true };
}
