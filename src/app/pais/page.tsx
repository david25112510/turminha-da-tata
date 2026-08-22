import { prisma } from "@/lib/prisma";
import { requireGuardian, pickChildLink } from "@/lib/guardian";
import { todayDateOnly, formatTime } from "@/lib/date";
import { ChildSwitcher } from "./ChildSwitcher";

export default async function GuardianHomePage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>;
}) {
  const { childId } = await searchParams;
  const guardian = await requireGuardian();
  const link = pickChildLink(guardian.children, childId);

  if (!link) {
    return <div className="p-8 text-sm text-[#8A7A62]">Nenhuma criança vinculada à sua conta.</div>;
  }

  const [attendance, notifications] = await Promise.all([
    prisma.attendance.findFirst({ where: { childId: link.childId, date: todayDateOnly() } }),
    prisma.notification.findMany({
      where: { guardianId: guardian.id, childId: link.childId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const child = link.child;
  const arrived = !!attendance?.checkInTime;
  const left = !!attendance?.checkOutTime;

  return (
    <div className="p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <ChildSwitcher basePath="/pais" activeChildId={link.childId} guardianChildren={guardian.children} />

      <div className="bg-[#FFFDF8] rounded-2xl shadow-sm p-6 flex flex-col gap-2">
        <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
          Olá! Aqui está a situação de {child.preferredName || child.fullName}
        </h1>

        {!arrived && (
          <p className="text-sm text-[#8A7A62]">Ainda não chegou à Turminha da Tata hoje.</p>
        )}
        {arrived && !left && (
          <p className="text-sm text-[#1F8A6E] font-semibold">
            Está na escola desde {formatTime(attendance!.checkInTime!)}. 💕
          </p>
        )}
        {arrived && left && (
          <p className="text-sm text-[#6B5D4A]">
            Chegou às {formatTime(attendance!.checkInTime!)} e saiu às {formatTime(attendance!.checkOutTime!)}. 🏠
          </p>
        )}
      </div>

      <div className="bg-[#FFFDF8] rounded-2xl shadow-sm p-5 flex flex-col gap-3">
        <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-[#2E2418]">
          Notificações recentes
        </span>
        {notifications.length === 0 ? (
          <p className="text-sm text-[#8A7A62]">Nenhuma notificação ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {notifications.map((n) => (
              <li key={n.id} className="text-sm border-b border-[#F3EEE1] pb-2 last:border-0">
                <span className="font-semibold text-[#2E2418]">{n.title}</span>
                <p className="text-[#6B5D4A]">{n.body}</p>
                <span className="text-xs text-[#9A8A72]">{formatTime(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
