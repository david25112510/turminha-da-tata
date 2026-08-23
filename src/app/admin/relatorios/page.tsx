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
  "border border-tata-border rounded-xl px-3 py-2 text-sm outline-none focus:border-tata-green transition-colors bg-tata-surface";
const sectionClass = "bg-tata-surface rounded-2xl shadow-sm p-5 flex flex-col gap-3";
const sectionTitle = "font-[family-name:var(--font-baloo)] font-semibold text-base text-tata-ink";
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
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
        Relatórios
      </h1>

      <form className="flex gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs text-tata-ink-soft">
          De
          <input type="date" name="from" defaultValue={toDateInput(start)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-tata-ink-soft">
          Até
          <input type="date" name="to" defaultValue={toDateInput(end)} className={inputClass} />
        </label>
        <button type="submit" className="bg-tata-green text-white rounded-xl px-4 py-2 text-sm font-semibold font-[family-name:var(--font-baloo)]">
          Filtrar
        </button>
      </form>

      <div className={sectionClass}>
        <span className={sectionTitle}>Crianças</span>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-tata-ink-muted border-b border-tata-border">
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
              <tr key={row.child.id} className="border-b border-tata-surface-hover last:border-0">
                <td className="py-2 text-tata-ink">{row.child.preferredName || row.child.fullName}</td>
                <td className="py-2 text-tata-ink-soft">{CHILD_STATUS_LABELS[row.status]}</td>
                <td className="py-2 text-tata-ink-soft">{row.frequency}</td>
                <td className="py-2 text-tata-ink-soft">{row.entries}</td>
                <td className="py-2 text-tata-ink-soft">{row.exits}</td>
                <td className="py-2 text-tata-ink-soft">
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
            <span className="text-xs font-semibold text-tata-ink-muted">Alimentação</span>
            <ul className="mt-1 flex flex-col gap-0.5">
              {routine.meals.map((m, i) => (
                <li key={i} className="text-tata-ink-soft">
                  {MEAL_TYPE_LABELS[m.mealType]} — {CONSUMPTION_LABELS[m.consumption]}: {m._count}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-xs font-semibold text-tata-ink-muted">Sono</span>
            <p className="text-tata-ink-soft">{routine.sleepCount} sonecas — média {routine.avgSleepMinutes} min</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-tata-ink-muted">Higiene</span>
            <ul className="mt-1 flex flex-col gap-0.5">
              {routine.hygiene.map((h, i) => (
                <li key={i} className="text-tata-ink-soft">{HYGIENE_TYPE_LABELS[h.type]}: {h._count}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-xs font-semibold text-tata-ink-muted">Atividades</span>
            <ul className="mt-1 flex flex-col gap-0.5">
              {routine.activities.map((a, i) => (
                <li key={i} className="text-tata-ink-soft">{ACTIVITY_CATEGORY_LABELS[a.category]}: {a._count}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-xs font-semibold text-tata-ink-muted">Humor</span>
            <ul className="mt-1 flex flex-col gap-0.5">
              {routine.moods.map((m, i) => (
                <li key={i} className="text-tata-ink-soft">{MOOD_LABELS[m.mood]}: {m._count}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-xs font-semibold text-tata-ink-muted">Observações de saúde</span>
            <p className="text-tata-ink-soft">{routine.observations}</p>
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <span className={sectionTitle}>Segurança</span>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p className="text-tata-ink-soft">Entradas: {security.entries} — Saídas: {security.exits}</p>
          <div>
            <span className="text-xs font-semibold text-tata-ink-muted">Pessoas que retiraram crianças</span>
            <ul className="mt-1 flex flex-col gap-0.5">
              {security.pickupPeople.map((p, i) => (
                <li key={i} className="text-tata-ink-soft">
                  {p.name}{p.relation ? ` — ${p.relation}` : ""}: {p.count}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {security.incidents.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-tata-ink-muted">Ocorrências</span>
            <ul className="mt-1 flex flex-col gap-0.5 text-sm">
              {security.incidents.map((inc) => (
                <li key={inc.id} className="text-tata-ink-soft">
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
            <span className="text-xs text-tata-ink-muted block">Mensalidades emitidas</span>
            <span className="font-semibold text-tata-ink">{financial.invoicesIssued}</span>
          </div>
          <div>
            <span className="text-xs text-tata-ink-muted block">Faturamento</span>
            <span className="font-semibold text-tata-ink">{currency(financial.billing)}</span>
          </div>
          <div>
            <span className="text-xs text-tata-ink-muted block">Recebimentos</span>
            <span className="font-semibold text-tata-ink">{currency(financial.received)}</span>
          </div>
          <div>
            <span className="text-xs text-tata-ink-muted block">Horas excedentes no período</span>
            <span className="font-semibold text-tata-ink">{currency(financial.overtimeTotal)}</span>
          </div>
        </div>
        {financial.delinquent.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-tata-ink-muted">Inadimplência</span>
            <ul className="mt-1 flex flex-col gap-0.5 text-sm">
              {financial.delinquent.map((inv) => (
                <li key={inv.id} className="text-tata-ink-soft">
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
