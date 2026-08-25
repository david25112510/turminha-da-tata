import { prisma } from "@/lib/prisma";
import { requireGuardian } from "@/lib/guardian";
import { ANNOUNCEMENT_TYPE_LABELS } from "@/lib/labels";
import { EmptyState } from "@/components/tata/EmptyState";
import { Card } from "@/components/tata/Card";

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
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
        📣 Comunicados
      </h1>

      {announcements.length === 0 ? (
        <EmptyState message="Nenhum comunicado por aqui ainda 💛" withMascot />
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((a, i) => (
            <Card key={a.id} animate style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }} className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-tata-ink">
                  {a.title}
                </span>
                <span className="text-xs font-semibold text-tata-green-dark bg-tata-green/10 px-2 py-0.5 rounded-full">
                  {ANNOUNCEMENT_TYPE_LABELS[a.type]}
                </span>
              </div>
              <p className="text-sm text-tata-ink-soft">{a.body}</p>
              <span className="text-xs text-tata-ink-muted mt-2 block">
                {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(a.createdAt)}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
