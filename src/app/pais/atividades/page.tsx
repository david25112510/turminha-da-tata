import { prisma } from "@/lib/prisma";
import { requireGuardian, pickChildLink } from "@/lib/guardian";
import { ACTIVITY_CATEGORY_LABELS } from "@/lib/labels";
import { ChildSwitcher } from "../ChildSwitcher";

export default async function GuardianActivitiesPage({
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

  const activityLinks = await prisma.activityChild.findMany({
    where: { childId: link.childId },
    include: { activity: true },
    orderBy: { activity: { time: "desc" } },
    take: 40,
  });

  return (
    <div className="p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <ChildSwitcher basePath="/pais/atividades" activeChildId={link.childId} children={guardian.children} />

      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
        Atividades — {link.child.preferredName || link.child.fullName}
      </h1>

      {activityLinks.length === 0 ? (
        <p className="text-sm text-[#8A7A62]">Nenhuma atividade registrada ainda.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {activityLinks.map((al) => (
            <div key={al.activityId} className="bg-[#FFFDF8] rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-[#2E2418]">
                  {ACTIVITY_CATEGORY_LABELS[al.activity.category]}
                </span>
                <span className="text-xs text-[#9A8A72]">
                  {new Intl.DateTimeFormat("pt-BR").format(al.activity.date)}
                </span>
              </div>
              {al.activity.description && (
                <p className="text-sm text-[#6B5D4A] mt-1">{al.activity.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
