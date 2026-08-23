import { prisma } from "@/lib/prisma";
import { requireGuardian, pickChildLink } from "@/lib/guardian";
import { EmptyState } from "@/components/tata/EmptyState";
import { ChildSwitcher } from "../ChildSwitcher";
import { ActivityCard } from "./ActivityCard";

export default async function GuardianActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>;
}) {
  const { childId } = await searchParams;
  const guardian = await requireGuardian();
  const link = pickChildLink(guardian.children, childId);

  if (!link) {
    return <div className="p-8 text-sm text-tata-ink-muted-alt">Nenhuma criança vinculada à sua conta.</div>;
  }

  if (!link.viewRoutine) {
    return (
      <div className="p-8 text-sm text-tata-ink-muted-alt">
        Você não tem permissão para visualizar as atividades desta criança.
      </div>
    );
  }

  const activityLinks = await prisma.activityChild.findMany({
    where: { childId: link.childId },
    include: { activity: true },
    orderBy: { activity: { time: "desc" } },
    take: 40,
  });

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <ChildSwitcher basePath="/pais/atividades" activeChildId={link.childId} guardianChildren={guardian.children} />

      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
        🎨 Atividades — {link.child.preferredName || link.child.fullName}
      </h1>

      {activityLinks.length === 0 ? (
        <EmptyState message="Nenhuma atividade registrada por aqui ainda 💛" withMascot />
      ) : (
        <div className="flex flex-col gap-3">
          {activityLinks.map((al, i) => (
            <ActivityCard
              key={al.activityId}
              category={al.activity.category}
              date={al.activity.date}
              description={al.activity.description}
              delayMs={Math.min(i, 8) * 40}
            />
          ))}
        </div>
      )}
    </div>
  );
}
