import {
  getChildrenReport,
  getRoutineReport,
  getSecurityReport,
  getFinancialReport,
} from "@/lib/reports";
import {
  CHILD_STATUS_LABELS,
  MEAL_TYPE_LABELS,
  CONSUMPTION_LABELS,
  HYGIENE_TYPE_LABELS,
  ACTIVITY_CATEGORY_LABELS,
  MOOD_LABELS,
  INCIDENT_TYPE_LABELS,
} from "@/lib/labels";

const inputClass =
  "border border-[#ECE1CB] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#1FA787] transition-colors bg-white";
const sectionClass = "bg-[#FFFDF8] rounded-2xl shadow-sm p-5 flex flex-col gap-3";
const sectionTitle = "font-[family-name:var(--font-baloo)] font-semibold text-base text-[#2E2418]";
const currency = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const end = to ? new Date(`${to}T23:59:59`) : new Date();
  const start = from ? new Date(`${from}T00:00:00`) : new Date(end.getFullYear(), end.getMonth(), 1);

  const [children, routine, security, financial] = await Promise.all([
    getChildrenReport(start, end),
    getRoutineReport(start, end),
    getSecurityReport(start, end),
    getFinancialReport(start, end),
  ]);

  return (
    <div className="p-8 flex flex-col gap-6 max-w-4xl">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
        Relatórios
      </h1>

      <form className="flex gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs text-[#6B5D4A]">
          De
          <input type="date" name="from" defaultValue={toDateInput(start)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#6B5D4A]">
          Até
          <input type="date" name="to" defaultValue={toDateInput(end)} className={inputClass} />
        </label>
        <button type="submit" className="bg-[#1FA787] text-white rounded-xl px-4 py-2 text-sm font-semibold font-[family-name:var(--font-baloo)]">
          Filtrar
        </button>
      </form>

      <div className={sectionClass}>
        <span className={sectionTitle}>Crianças</span>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#9A8A72] border-b border-[#ECE1CB]">
              <th className="py-2 font-semibold">Nome</th>
              <th className="py-2 font-semibold">Status</th>
              <th className="py-2 font-semibold">Frequência</th>
              <th className="py-2 font-semibold">Entradas</th>
              <th className="py-2 font-semibold">Saídas</th>
              <th className="py-2 font-semibold">Permanência média</th>
            </tr>
          </thead>
          <tbody>
            {children.map((row) => (
              <tr key={row.child.id} className="border-b border-[#F3EEE1] last:border-0">
                <td className="py-2 text-[#2E2418]">{row.child.preferredName || row.child.fullName}</td>
                <td className="py-2 text-[#6B5D4A]">{CHILD_STATUS_LABELS[row.status]}</td>
                <td className="py-2 text-[#6B5D4A]">{row.frequency}</td>
                <td className="py-2 text-[#6B5D4A]">{row.entries}</td>
                <td className="py-2 text-[#6B5D4A]">{row.exits}</td>
                <td className="py-2 text-[#6B5D4A]">
                  {row.avgMinutesPresent > 0 ? `${Math.floor(row.avgMinutesPresent / 60)}h${(row.avgMinutesPresent % 60).toString().padStart(2, "0")}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={sectionClass}>
        <span className={sectionTitle}>Rotina</span>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs font-semibold text-[#9A8A72]">Alimentação</span>
            <ul className="mt-1 flex flex-col gap-0.5">
              {routine.meals.map((m, i) => (
                <li key={i} className="text-[#6B5D4A]">
                  {MEAL_TYPE_LABELS[m.mealType]} — {CONSUMPTION_LABELS[m.consumption]}: {m._count}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-xs font-semibold text-[#9A8A72]">Sono</span>
            <p className="text-[#6B5D4A]">{routine.sleepCount} sonecas — média {routine.avgSleepMinutes} min</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-[#9A8A72]">Higiene</span>
            <ul className="mt-1 flex flex-col gap-0.5">
              {routine.hygiene.map((h, i) => (
                <li key={i} className="text-[#6B5D4A]">{HYGIENE_TYPE_LABELS[h.type]}: {h._count}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-xs font-semibold text-[#9A8A72]">Atividades</span>
            <ul className="mt-1 flex flex-col gap-0.5">
              {routine.activities.map((a, i) => (
                <li key={i} className="text-[#6B5D4A]">{ACTIVITY_CATEGORY_LABELS[a.category]}: {a._count}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-xs font-semibold text-[#9A8A72]">Humor</span>
            <ul className="mt-1 flex flex-col gap-0.5">
              {routine.moods.map((m, i) => (
                <li key={i} className="text-[#6B5D4A]">{MOOD_LABELS[m.mood]}: {m._count}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-xs font-semibold text-[#9A8A72]">Observações de saúde</span>
            <p className="text-[#6B5D4A]">{routine.observations}</p>
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <span className={sectionTitle}>Segurança</span>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p className="text-[#6B5D4A]">Entradas: {security.entries} — Saídas: {security.exits}</p>
          <div>
            <span className="text-xs font-semibold text-[#9A8A72]">Pessoas que retiraram crianças</span>
            <ul className="mt-1 flex flex-col gap-0.5">
              {security.pickupPeople.map((p, i) => (
                <li key={i} className="text-[#6B5D4A]">
                  {p.name}{p.relation ? ` — ${p.relation}` : ""}: {p.count}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {security.incidents.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-[#9A8A72]">Ocorrências</span>
            <ul className="mt-1 flex flex-col gap-0.5 text-sm">
              {security.incidents.map((inc) => (
                <li key={inc.id} className="text-[#6B5D4A]">
                  {new Intl.DateTimeFormat("pt-BR").format(inc.time)} — {inc.child.preferredName || inc.child.fullName}: {INCIDENT_TYPE_LABELS[inc.type]}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className={sectionClass}>
        <span className={sectionTitle}>Financeiro</span>
        <div className="grid grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-xs text-[#9A8A72] block">Mensalidades emitidas</span>
            <span className="font-semibold text-[#2E2418]">{financial.invoicesIssued}</span>
          </div>
          <div>
            <span className="text-xs text-[#9A8A72] block">Faturamento</span>
            <span className="font-semibold text-[#2E2418]">{currency(financial.billing)}</span>
          </div>
          <div>
            <span className="text-xs text-[#9A8A72] block">Recebimentos</span>
            <span className="font-semibold text-[#2E2418]">{currency(financial.received)}</span>
          </div>
          <div>
            <span className="text-xs text-[#9A8A72] block">Horas excedentes no período</span>
            <span className="font-semibold text-[#2E2418]">{currency(financial.overtimeTotal)}</span>
          </div>
        </div>
        {financial.delinquent.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-[#9A8A72]">Inadimplência</span>
            <ul className="mt-1 flex flex-col gap-0.5 text-sm">
              {financial.delinquent.map((inv) => (
                <li key={inv.id} className="text-[#6B5D4A]">
                  {inv.child.preferredName || inv.child.fullName} — {currency(Number(inv.totalAmount) - Number(inv.paidAmount))}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
