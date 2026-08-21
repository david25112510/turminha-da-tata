import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { todayDateOnly, formatTime } from "@/lib/date";
import { checkInAction, checkOutAction } from "./actions";

const inputClass =
  "border border-[#ECE1CB] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#1FA787] transition-colors bg-white w-full";

export default async function CaregiverHomePage() {
  const date = todayDateOnly();

  const children = await prisma.child.findMany({
    where: { status: "ACTIVE" },
    orderBy: { fullName: "asc" },
    include: {
      attendances: { where: { date } },
    },
  });

  return (
    <div className="p-6 flex flex-col gap-5 max-w-3xl mx-auto">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
        Painel do dia
      </h1>

      <div className="flex flex-col gap-3">
        {children.map((child) => {
          const attendance = child.attendances[0];
          const arrived = !!attendance?.checkInTime;
          const left = !!attendance?.checkOutTime;

          return (
            <div key={child.id} className="bg-[#FFFDF8] rounded-2xl shadow-sm p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Link
                  href={`/cuidadora/criancas/${child.id}`}
                  className="font-[family-name:var(--font-baloo)] font-semibold text-[#2E2418] hover:text-[#1FA787]"
                >
                  {child.preferredName || child.fullName}
                </Link>
                <div className="flex gap-2 text-xs">
                  {arrived && (
                    <span className="bg-[#1FA787]/10 text-[#1F8A6E] font-semibold px-2.5 py-1 rounded-full">
                      Chegou {formatTime(attendance.checkInTime!)}
                    </span>
                  )}
                  {left && (
                    <span className="bg-[#E85570]/10 text-[#E85570] font-semibold px-2.5 py-1 rounded-full">
                      Saiu {formatTime(attendance.checkOutTime!)}
                    </span>
                  )}
                  {!arrived && !left && (
                    <span className="bg-[#9A8A72]/10 text-[#9A8A72] font-semibold px-2.5 py-1 rounded-full">
                      Aguardando
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {!arrived && (
                  <form action={checkInAction} className="flex flex-col gap-1.5">
                    <input type="hidden" name="childId" value={child.id} />
                    <input name="personName" placeholder="Quem levou" required className={inputClass} />
                    <input name="personRelation" placeholder="Parentesco" className={inputClass} />
                    <button
                      type="submit"
                      className="bg-[#1FA787] text-white text-xs font-semibold rounded-lg py-1.5 font-[family-name:var(--font-baloo)]"
                    >
                      Registrar chegada
                    </button>
                  </form>
                )}
                {arrived && !left && (
                  <form action={checkOutAction} className="flex flex-col gap-1.5">
                    <input type="hidden" name="childId" value={child.id} />
                    <input name="personName" placeholder="Quem retirou" required className={inputClass} />
                    <input name="personRelation" placeholder="Parentesco" className={inputClass} />
                    <button
                      type="submit"
                      className="bg-[#FF6F8E] text-white text-xs font-semibold rounded-lg py-1.5 font-[family-name:var(--font-baloo)]"
                    >
                      Registrar saída
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
