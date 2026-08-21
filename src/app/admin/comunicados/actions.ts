"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function createAnnouncementAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const type = String(formData.get("type") ?? "ANNOUNCEMENT");
  const target = String(formData.get("target") ?? "ALL");
  const eventDate = String(formData.get("eventDate") ?? "");
  const targetGuardianId = String(formData.get("targetGuardianId") ?? "");
  const targetChildId = String(formData.get("targetChildId") ?? "");

  if (!title || !body) throw new Error("Título e mensagem são obrigatórios.");

  await prisma.announcement.create({
    data: {
      title,
      body,
      type: type as never,
      target: target as never,
      eventDate: eventDate ? new Date(eventDate) : null,
      targetGuardianId: target === "GUARDIAN" && targetGuardianId ? targetGuardianId : null,
      targetChildId: target === "CHILD" && targetChildId ? targetChildId : null,
      createdById: session.user.id,
    },
  });

  revalidatePath("/admin/comunicados");
}
