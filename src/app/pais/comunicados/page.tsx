import { prisma } from "@/lib/prisma";
import { requireGuardian } from "@/lib/guardian";
import { ANNOUNCEMENT_TYPE_LABELS } from "@/lib/labels";

export default async function GuardianAnnouncementsPage() {
  const guardian = await requireGuardian();
  const childIds = guardian.children.map((l) => l.childId);

  const announcements = await prisma.announcement.findMany({
    where: {
      OR: [
        { target: "ALL" },
        { target: "GUARDIAN", targetGuardianId: guardian.id },
        { target: "CHILD", targetChildId: { in: childIds } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
        📣 Comunicados
      </h1>

      {announcements.length === 0 ? (
        <p className="text-sm text-[#8A7A62]">Nenhum comunicado por enquanto.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-[#FFFDF8] rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-[#2E2418]">
                  {a.title}
                </span>
                <span className="text-xs font-semibold text-[#1F8A6E] bg-[#1FA787]/10 px-2 py-0.5 rounded-full">
                  {ANNOUNCEMENT_TYPE_LABELS[a.type]}
                </span>
              </div>
              <p className="text-sm text-[#6B5D4A]">{a.body}</p>
              <span className="text-xs text-[#9A8A72] mt-2 block">
                {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(a.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
