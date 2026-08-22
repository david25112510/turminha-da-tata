import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

async function requestMeta() {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    const userAgent = h.get("user-agent");
    return { ip, userAgent };
  } catch {
    return { ip: null, userAgent: null };
  }
}

export async function recordAuditLog(params: {
  actorUserId: string;
  action: string;
  entity: string;
  entityId: string;
  oldData?: unknown;
  newData?: unknown;
}) {
  try {
    const { ip, userAgent } = await requestMeta();
    await prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        oldData: params.oldData === undefined ? undefined : (params.oldData as object),
        newData: params.newData === undefined ? undefined : (params.newData as object),
        ip,
        userAgent,
      },
    });
  } catch (error) {
    console.error("Falha ao registrar log de auditoria:", error);
  }
}
