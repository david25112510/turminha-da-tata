import { prisma } from "@/lib/prisma";

export default async function AdminHome() {
  const [totalChildren, activeChildren, totalGuardians] = await Promise.all([
    prisma.child.count(),
    prisma.child.count({ where: { status: "ACTIVE" } }),
    prisma.guardian.count(),
  ]);

  const cards = [
    { label: "Total de crianças", value: totalChildren },
    { label: "Crianças ativas", value: activeChildren },
    { label: "Responsáveis cadastrados", value: totalGuardians },
  ];

  return (
    <div className="p-8 flex flex-col gap-6">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
        Visão geral
      </h1>

      <div className="grid grid-cols-3 gap-4 max-w-2xl">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-[#FFFDF8] rounded-2xl p-5 shadow-sm flex flex-col gap-2"
          >
            <div className="font-[family-name:var(--font-baloo)] font-bold text-2xl text-[#2E2418]">
              {card.value}
            </div>
            <div className="text-xs text-[#8A7A62]">{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
