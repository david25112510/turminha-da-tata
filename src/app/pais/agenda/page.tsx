import { prisma } from "@/lib/prisma";
import { requireGuardian } from "@/lib/guardian";

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
    <div className="p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
        Agenda
      </h1>

      <div className="flex flex-col gap-2">
        <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-[#2E2418]">
          Próximos eventos
        </span>
        {upcoming.length === 0 ? (
          <p className="text-sm text-[#8A7A62]">Nenhum evento agendado.</p>
        ) : (
          upcoming.map((e) => (
            <div key={e.id} className="bg-[#FFFDF8] rounded-2xl shadow-sm p-4 flex items-center justify-between">
              <div>
                <span className="font-semibold text-sm text-[#2E2418]">{e.title}</span>
                <p className="text-sm text-[#6B5D4A]">{e.body}</p>
              </div>
              <span className="text-xs font-semibold text-[#1F8A6E] bg-[#1FA787]/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                {new Intl.DateTimeFormat("pt-BR").format(e.eventDate!)}
              </span>
            </div>
          ))
        )}
      </div>

      {past.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-[#8A7A62]">
            Eventos passados
          </span>
          {past.map((e) => (
            <div key={e.id} className="bg-[#FFFDF8]/60 rounded-2xl p-4 flex items-center justify-between opacity-70">
              <div>
                <span className="font-semibold text-sm text-[#2E2418]">{e.title}</span>
                <p className="text-sm text-[#6B5D4A]">{e.body}</p>
              </div>
              <span className="text-xs font-semibold text-[#9A8A72] bg-[#9A8A72]/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                {new Intl.DateTimeFormat("pt-BR").format(e.eventDate!)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
