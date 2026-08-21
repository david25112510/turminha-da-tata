import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { todayDateOnly, formatTime } from "@/lib/date";
import { RELATIONSHIP_LABELS } from "@/lib/labels";
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
      guardians: {
        orderBy: { isPrimary: "desc" },
        include: { guardian: true },
      },
      authorizedPickupPeople: {
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
      },
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {!arrived && (
                  <form action={checkInAction} className="flex flex-col gap-1.5">
                    <input type="hidden" name="childId" value={child.id} />
                    <label className="text-[11px] font-semibold text-[#6F6252]">Quem trouxe?</label>
                    <select name="personRef" required className={inputClass} defaultValue="">
                      <option value="" disabled>Selecione uma pessoa autorizada</option>
                      {child.guardians.map((link) => (
                        <option key={`guardian-${link.guardianId}`} value={`GUARDIAN:${link.guardianId}`}>
                          {link.guardian.name} — {RELATIONSHIP_LABELS[link.relationship] ?? link.relationship}
                        </option>
                      ))}
                      {child.authorizedPickupPeople.map((person) => (
                        <option key={`authorized-${person.id}`} value={`AUTHORIZED:${person.id}`}>
                          {person.name} — {RELATIONSHIP_LABELS[person.relationship] ?? person.relationship}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-[#9A8A72]">Somente responsáveis vinculados ou pessoas autorizadas ativas podem ser selecionados.</p>
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
                    <label className="text-[11px] font-semibold text-[#6F6252]">Quem está buscando?</label>
                    <select name="personRef" required className={inputClass} defaultValue="">
                      <option value="" disabled>Selecione uma pessoa autorizada</option>
                      {child.guardians.map((link) => (
                        <option key={`guardian-${link.guardianId}`} value={`GUARDIAN:${link.guardianId}`}>
                          {link.guardian.name} — {RELATIONSHIP_LABELS[link.relationship] ?? link.relationship}
                        </option>
                      ))}
                      {child.authorizedPickupPeople.map((person) => (
                        <option key={`authorized-${person.id}`} value={`AUTHORIZED:${person.id}`}>
                          {person.name} — {RELATIONSHIP_LABELS[person.relationship] ?? person.relationship}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-[#9A8A72]">A retirada é validada novamente no servidor antes do registro.</p>
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
