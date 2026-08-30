"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isRateLimited, recordFailedAttempt } from "@/lib/rate-limit";
import { digits, isValidCpf } from "@/lib/cpf";
import { recordAuditLog } from "@/lib/audit-log";
import { notifyAdmins } from "@/lib/notifications";
import { TURNSTILE_FIELD, turnstileError, verifyTurnstileToken } from "@/lib/turnstile";

export type EnrollmentState = { success?: true; error?: string } | undefined;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createEnrollmentAccountAction(_prev: EnrollmentState, formData: FormData): Promise<EnrollmentState> {
  if (!(await verifyTurnstileToken(formData.get(TURNSTILE_FIELD)))) return turnstileError();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const cpf = digits(String(formData.get("cpf") ?? ""));
  const phone = String(formData.get("phone") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const birthDateText = String(formData.get("birthDate") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!name || !emailPattern.test(email) || !phone || !birthDateText) return { error: "Preencha todos os dados obrigatórios." };
  if (!isValidCpf(cpf)) return { error: "Informe um CPF válido." };
  if (password.length < 8 || password !== String(formData.get("confirmPassword") ?? "")) return { error: "As senhas devem ser iguais e ter pelo menos 8 caracteres." };
  if (formData.get("privacyAccepted") !== "on") return { error: "É necessário aceitar a Política de Privacidade." };
  if (await isRateLimited(`enrollment-account:${email}`)) return { error: "Muitas tentativas. Tente novamente em alguns minutos." };
  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { cpf }] }, select: { id: true } });
  if (existing) {
    await recordFailedAttempt(`enrollment-account:${email}`);
    return { error: "Já existe uma conta com este e-mail ou CPF. Entre para continuar." };
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.$transaction(async (tx) => {
    // Locks transacionais tornam a checagem + criação atômica também para CPF, que é nullable e
    // legado sem índice único. A ordem fixa evita deadlock entre solicitações concorrentes.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`enrollment-account-email:${email}`}))`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`enrollment-account-cpf:${cpf}`}))`;
    const concurrentExisting = await tx.user.findFirst({ where: { OR: [{ email }, { cpf }] }, select: { id: true } });
    if (concurrentExisting) return null;
    const created = await tx.user.create({ data: { name, email, cpf, phone, birthDate: new Date(`${birthDateText}T12:00:00`), passwordHash, role: "GUARDIAN" } });
    await tx.guardian.create({ data: { userId: created.id, name, email, cpf, phone, whatsapp: whatsapp || phone, birthDate: new Date(`${birthDateText}T12:00:00`) } });
    return created;
  }, { isolationLevel: "Serializable" });
  if (!user) {
    await recordFailedAttempt(`enrollment-account:${email}`);
    return { error: "Já existe uma conta com este e-mail ou CPF. Entre para continuar." };
  }
  await recordAuditLog({ actorUserId: user.id, action: "CONTA_MATRICULA_CRIADA", entity: "User", entityId: user.id, newData: { role: "GUARDIAN" } });
  return { success: true };
}

export async function submitEnrollmentAction(_prev: EnrollmentState, formData: FormData): Promise<EnrollmentState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "GUARDIAN") return { error: "Entre com sua conta de responsável para enviar a matrícula." };
  const guardian = await prisma.guardian.findUnique({ where: { userId: session.user.id } });
  if (!guardian) return { error: "Cadastro de responsável não encontrado." };
  if (await isRateLimited(`enrollment-submit:${session.user.id}`)) return { error: "Muitas tentativas. Aguarde alguns minutos." };
  const fullName = String(formData.get("childFullName") ?? "").trim();
  const birthDateText = String(formData.get("childBirthDate") ?? "");
  const sex = String(formData.get("childSex") ?? "");
  if (!fullName || !birthDateText || !["FEMALE", "MALE"].includes(sex)) return { error: "Confira os dados obrigatórios da criança." };
  const birthDate = new Date(`${birthDateText}T12:00:00`);
  if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) return { error: "Data de nascimento inválida." };
  const childCpf = digits(String(formData.get("childCpf") ?? ""));
  if (childCpf && !isValidCpf(childCpf)) return { error: "O CPF da criança é inválido." };
  let authorizedPeople: Array<{ name: string; cpf?: string; phone: string; relationship: string; notes?: string }> = [];
  try { authorizedPeople = JSON.parse(String(formData.get("authorizedPeople") ?? "[]")); } catch { return { error: "Revise as pessoas autorizadas." }; }
  if (authorizedPeople.length > 10 || authorizedPeople.some((p) => !p.name?.trim() || !p.phone?.trim())) return { error: "Preencha nome e telefone de cada pessoa autorizada." };
  const relationship = String(formData.get("relationship") ?? "LEGAL_GUARDIAN");
  const normalizedName = fullName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
  const request = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`enrollment:${guardian.id}:name:${normalizedName}:birth:${birthDateText}`}))`;
    if (childCpf) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`enrollment:${guardian.id}:cpf:${childCpf}`}))`;
    const activeRequests = await tx.enrollmentRequest.findMany({
      where: { guardianId: guardian.id, status: { in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED"] } },
      select: { id: true, childFullName: true, childBirthDate: true, childCpf: true },
    });
    const duplicate = activeRequests.find((item) =>
      (Boolean(childCpf) && item.childCpf === childCpf)
      || (item.childBirthDate.getTime() === birthDate.getTime() && item.childFullName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ") === normalizedName)
    );
    if (duplicate) return null;
    return tx.enrollmentRequest.create({ data: {
      guardianId: guardian.id, status: "SUBMITTED", submittedAt: new Date(), childFullName: fullName,
      childPreferredName: String(formData.get("childPreferredName") ?? "").trim() || null, childBirthDate: birthDate,
      childSex: sex as "FEMALE" | "MALE", childCpf: childCpf || null,
      birthCertificate: String(formData.get("birthCertificate") ?? "").trim() || null,
      relationship: relationship as never,
      allergies: String(formData.get("allergies") ?? "").trim() || null,
      dietaryRestrictions: String(formData.get("dietaryRestrictions") ?? "").trim() || null,
      medications: String(formData.get("medications") ?? "").trim() || null,
      relevantConditions: String(formData.get("relevantConditions") ?? "").trim() || null,
      specificNeeds: String(formData.get("specificNeeds") ?? "").trim() || null,
      importantCareInfo: String(formData.get("importantCareInfo") ?? "").trim() || null,
      generalNotes: String(formData.get("generalNotes") ?? "").trim() || null,
      imageAuthInternal: formData.get("imageAuthInternal") === "on",
      imageAuthGuardianShare: formData.get("imageAuthGuardianShare") === "on",
      imageAuthInstitutional: formData.get("imageAuthInstitutional") === "on",
      imageAuthSocialMedia: formData.get("imageAuthSocialMedia") === "on",
      imageAuthAdvertising: formData.get("imageAuthAdvertising") === "on",
      authorizedPeople: { create: authorizedPeople.map((p) => ({ name: p.name.trim(), cpf: digits(p.cpf ?? "") || null, phone: p.phone.trim(), relationship: (p.relationship || "OTHER") as never, notes: p.notes?.trim() || null })) },
    } });
  }, { isolationLevel: "Serializable" });
  if (!request) return { error: "Já existe uma matrícula ativa para esta criança." };
  await recordAuditLog({ actorUserId: session.user.id, action: "MATRICULA_ENVIADA", entity: "EnrollmentRequest", entityId: request.id, newData: { status: "SUBMITTED", childFullName: fullName } });
  await notifyAdmins("SIGNUP_REQUEST", "Nova matrícula", `${guardian.name} enviou a matrícula de ${fullName}.`, { entity: "EnrollmentRequest", entityId: request.id });
  revalidatePath("/matricula"); revalidatePath("/admin/matriculas");
  return { success: true };
}
