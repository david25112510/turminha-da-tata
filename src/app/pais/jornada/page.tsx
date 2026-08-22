import { requireGuardian, pickChildLink } from "@/lib/guardian";
import { todayRange, formatTime } from "@/lib/date";
import { buildTimeline } from "@/lib/journey";
import { ChildSwitcher } from "../ChildSwitcher";

export default async function GuardianJourneyPage({
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

  if (!link.viewRoutine) {
    return (
      <div className="p-8 text-sm text-[#8A7A62]">
        Você não tem permissão para visualizar a rotina desta criança.
      </div>
    );
  }

  const { start, end } = todayRange();
  const timeline = await buildTimeline(link.childId, start, end);

  return (
    <div className="p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <ChildSwitcher basePath="/pais/jornada" activeChildId={link.childId} guardianChildren={guardian.children} />

      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
        Jornada de hoje — {link.child.preferredName || link.child.fullName}
      </h1>

      <div className="bg-[#FFFDF8] rounded-2xl shadow-sm p-5">
        {timeline.length === 0 ? (
          <p className="text-sm text-[#8A7A62]">Nenhum registro por enquanto.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {timeline.map((entry, i) => (
              <li key={i} className="flex gap-3 items-start text-sm">
                <span className="font-mono text-xs text-[#9A8A72] w-12 shrink-0 pt-0.5">
                  {formatTime(entry.time)}
                </span>
                <div>
                  <span className="font-semibold text-[#2E2418]">{entry.label}</span>
                  <span className="text-[#6B5D4A]"> — {entry.detail}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
