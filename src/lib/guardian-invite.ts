import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function normalize(code: string) {
  return code.trim().toUpperCase();
}

/**
 * Gera um convite de responsável para UMA criança — devolve o código bruto, que só existe aqui e
 * nunca mais é recuperável (só o hash fica salvo, mesmo padrão de src/lib/password-reset.ts). O
 * admin repassa esse código pessoalmente à família (não é um link público) — a única forma de
 * alguém se vincular como responsável de uma criança específica na tela pública /cadastro.
 */
export async function createGuardianInvite(childId: string, createdByUserId: string): Promise<{ id: string; code: string }> {
  const code = randomBytes(4).toString("hex").toUpperCase();

  const invite = await prisma.guardianInvite.create({
    data: {
      childId,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      createdByUserId,
    },
  });

  return { id: invite.id, code };
}

/**
 * Valida e consome um código de convite atomicamente (updateMany condicional evita duas
 * solicitações simultâneas usando o mesmo código). Consumido já na criação da SignupRequest, não
 * só na aprovação — se a solicitação for recusada, o código fica queimado; o admin gera outro.
 */
export async function consumeGuardianInvite(rawCode: string): Promise<{ id: string; childId: string } | null> {
  if (!rawCode) return null;
  const codeHash = hashCode(normalize(rawCode));

  const invite = await prisma.guardianInvite.findUnique({ where: { codeHash } });
  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) return null;

  const result = await prisma.guardianInvite.updateMany({
    where: { id: invite.id, status: "PENDING" },
    data: { status: "USED", usedAt: new Date() },
  });
  if (result.count === 0) return null;

  return { id: invite.id, childId: invite.childId };
}
