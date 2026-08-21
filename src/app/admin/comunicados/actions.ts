"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export async function createAnnouncementAction(formData: FormData) {
  const admin = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const type = String(formData.get("type") ?? "ANNOUNCEMENT");
  const target = String(formData.get("target") ?? "ALL");
  const eventDate = String(formData.get("eventDate") ?? "");
  const targetGuardianId = String(formData.get("targetGuardianId") ?? "");
  const targetChildId = String(formData.get("targetChildId") ?? "");

  if (!title || !body) throw new Error("Título e mensagem são obrigatórios.");

  if (target === "GUARDIAN") {
    const guardian = await prisma.guardian.findUnique({ where: { id: targetGuardianId } });
    if (!guardian) throw new Error("Responsável destinatário não encontrado.");
  }

  if (target === "CHILD") {
    const child = await prisma.child.findUnique({ where: { id: targetChildId } });
    if (!child || child.status !== "ACTIVE") throw new Error("Criança destinatária não encontrada ou inativa.");
  }

  await prisma.announcement.create({
    data: {
      title,
      body,
      type: type as never,
      target: target as never,
      eventDate: eventDate ? new Date(eventDate) : null,
      targetGuardianId: target === "GUARDIAN" && targetGuardianId ? targetGuardianId : null,
      targetChildId: target === "CHILD" && targetChildId ? targetChildId : null,
      createdById: admin.id,
    },
  });

  revalidatePath("/admin/comunicados");
}
