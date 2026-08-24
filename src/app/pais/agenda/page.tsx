import { prisma } from "@/lib/prisma";
import { requireGuardian } from "@/lib/guardian";
import { EmptyState } from "@/components/tata/EmptyState";

export default async function GuardianAgendaPage() {
  const guardian = await requireGuardian();
  const childIds = guardian.children.map((l) => l.childId);

  const events = await prisma.announcement.findMany({
    where: {
      type: "EVENT",
      eventDate: { not: null },
      OR: [
        { target: "ALL" },
        { target: "GUARDIAN", targetGuardianId: guardian.id },
        { target: "CHILD", targetChildId: { in: childIds } },
      ],
    },
    orderBy: { eventDate: "asc" },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = events.filter((e) => e.eventDate! >= today);
  const past = events.filter((e) => e.eventDate! < today).reverse();

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
        📅 Agenda
      </h1>

      <div className="flex flex-col gap-2">
        <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-tata-ink">
          Próximos eventos
        </span>
        {upcoming.length === 0 ? (
          <EmptyState message="Nenhum evento agendado por enquanto 💛" withMascot />
        ) : (
          upcoming.map((e) => (
            <div key={e.id} className="bg-tata-surface rounded-2xl shadow-sm p-4 flex items-center justify-between">
              <div>
                <span className="font-semibold text-sm text-tata-ink">{e.title}</span>
                <p className="text-sm text-tata-ink-soft">{e.body}</p>
              </div>
              <span className="text-xs font-semibold text-tata-green-dark bg-tata-green/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                {new Intl.DateTimeFormat("pt-BR").format(e.eventDate!)}
              </span>
            </div>
          ))
        )}
      </div>

      {past.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-tata-ink-muted-alt">
            Eventos passados
          </span>
          {past.map((e) => (
            <div key={e.id} className="bg-tata-surface/60 rounded-2xl p-4 flex items-center justify-between opacity-70">
              <div>
                <span className="font-semibold text-sm text-tata-ink">{e.title}</span>
                <p className="text-sm text-tata-ink-soft">{e.body}</p>
              </div>
              <span className="text-xs font-semibold text-tata-ink-muted bg-tata-ink-muted/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                {new Intl.DateTimeFormat("pt-BR").format(e.eventDate!)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
