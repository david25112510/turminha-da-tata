import Link from "next/link";
import { getDashboardData } from "@/lib/dashboard";
import { EmptyState } from "@/components/tata/EmptyState";

const currency = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export default async function AdminHome() {
  const { indicators, routine, alerts } = await getDashboardData();

  const indicatorCards = [
    { label: "Total de crianças", value: indicators.totalChildren, icon: "👧" },
    { label: "Presentes hoje", value: indicators.present, icon: "🟢", accent: "border-l-tata-green" },
    { label: "Ainda não chegaram", value: indicators.notArrived, icon: "🟡", accent: "border-l-tata-yellow" },
    { label: "Ainda na escola", value: indicators.stillAtSchool, icon: "🏫" },
    { label: "Cuidadoras ativas", value: indicators.caregiversActive, icon: "👩🏾‍🏫", href: "/admin/cuidadoras" },
    { label: "Entradas hoje", value: indicators.entriesToday, icon: "↘️" },
    { label: "Saídas hoje", value: indicators.exitsToday, icon: "↗️" },
    {
      label: "Ocorrências hoje",
      value: indicators.occurrencesToday,
      icon: "⚠️",
      accent: indicators.occurrencesToday > 0 ? "border-l-tata-coral" : undefined,
    },
    { label: "Medicamentos hoje", value: indicators.medicationsToday, icon: "💊" },
    { label: "Horas excedentes (mês)", value: currency(indicators.overtimeAccumulated), icon: "⏱️" },
    {
      label: "Mensalidades pendentes",
      value: `${indicators.pendingInvoicesCount} — ${currency(indicators.pendingInvoicesTotal)}`,
      icon: "💰",
      accent: indicators.pendingInvoicesCount > 0 ? "border-l-tata-coral" : undefined,
      href: "/admin/financeiro",
    },
    { label: "Recebido no mês", value: currency(indicators.receivedThisMonth), icon: "✅", accent: "border-l-tata-green" },
  ];

  const routineCards = [
    { label: "Alimentações", value: routine.meals },
    { label: "Sonecas", value: routine.sleeps },
    { label: "Atividades", value: routine.activities },
    { label: "Higiene", value: routine.hygiene },
    { label: "Trocas de fralda", value: routine.diapers },
    { label: "Observações de saúde", value: routine.observations },
  ];

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-8">
      <div>
        <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink mb-4">
          Visão geral
        </h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {indicatorCards.map((card) => {
            const accent = "accent" in card ? card.accent : undefined;
            const cardClass = `bg-tata-surface rounded-2xl p-4 shadow-sm flex flex-col gap-1 ${
              accent ? `border-l-4 ${accent}` : ""
            }`;
            const content = (
              <>
                <div className="flex items-center gap-1.5">
                  <span aria-hidden="true">{card.icon}</span>
                  <span className="font-[family-name:var(--font-baloo)] font-bold text-lg text-tata-ink">
                    {card.value}
                  </span>
                </div>
                <div className="text-xs text-tata-ink-muted-alt">{card.label}</div>
              </>
            );
            return "href" in card && card.href ? (
              <Link
                key={card.label}
                href={card.href}
                className={`${cardClass} hover:shadow-tata-card-hover active:scale-[0.99] transition-all`}
              >
                {content}
              </Link>
            ) : (
              <div key={card.label} className={cardClass}>
                {content}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="font-[family-name:var(--font-baloo)] font-semibold text-base text-tata-ink mb-3">
          Resumo da rotina de hoje
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {routineCards.map((card) => (
            <div key={card.label} className="bg-tata-surface rounded-2xl p-4 shadow-sm flex flex-col gap-1">
              <div className="font-[family-name:var(--font-baloo)] font-bold text-lg text-tata-green-dark">
                {card.value}
              </div>
              <div className="text-xs text-tata-ink-muted-alt">{card.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-[family-name:var(--font-baloo)] font-semibold text-base text-tata-ink">
          Alertas
        </h2>

        {alerts.notArrivedChildren.length === 0 &&
        alerts.stillPresentChildren.length === 0 &&
        alerts.medicationsPending.length === 0 &&
        alerts.openIncidents.length === 0 &&
        alerts.overdueInvoices.length === 0 &&
        alerts.childrenWithOvertime.length === 0 ? (
          <EmptyState message="Nenhum alerta no momento." withMascot />
        ) : (
          <div className="flex flex-col gap-2">
            {alerts.notArrivedChildren.map((c) => (
              <AlertRow key={`na-${c.id}`} tone="neutral">
                {c.preferredName || c.fullName} ainda não chegou hoje.
              </AlertRow>
            ))}
            {alerts.stillPresentChildren.map((c) => (
              <AlertRow key={`sp-${c.id}`} tone="neutral">
                {c.preferredName || c.fullName} ainda está na escola.
              </AlertRow>
            ))}
            {alerts.medicationsPending.map((m) => (
              <AlertRow key={`med-${m.id}`} tone="warning">
                {m.child.preferredName || m.child.fullName}: {m.medication} pendente de registro hoje.
              </AlertRow>
            ))}
            {alerts.openIncidents.map((inc) => (
              <AlertRow key={`inc-${inc.id}`} tone="danger">
                <Link href={`/admin/criancas/${inc.childId}`} className="hover:underline">
                  {inc.child.preferredName || inc.child.fullName}
                </Link>
                : ocorrência aguardando comunicação ao responsável.
              </AlertRow>
            ))}
            {alerts.overdueInvoices.map((inv) => (
              <AlertRow key={`inv-${inv.id}`} tone="danger">
                <Link href={`/admin/financeiro/${inv.childId}`} className="hover:underline">
                  {inv.child.preferredName || inv.child.fullName}
                </Link>
                : mensalidade vencida — {currency(Number(inv.totalAmount) - Number(inv.paidAmount))}.
              </AlertRow>
            ))}
            {alerts.childrenWithOvertime.map(({ child, amount }) => (
              <AlertRow key={`ot-${child!.id}`} tone="warning">
                {child!.preferredName || child!.fullName}: {currency(amount)} em horas excedentes acumuladas no mês.
              </AlertRow>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AlertRow({ children, tone }: { children: React.ReactNode; tone: "neutral" | "warning" | "danger" }) {
  const toneClass =
    tone === "danger"
      ? "bg-tata-coral-dark/10 text-tata-coral-deep"
      : tone === "warning"
        ? "bg-tata-yellow/10 text-tata-yellow-dark"
        : "bg-tata-ink-muted/10 text-tata-ink-soft";

  return <div className={`text-sm px-4 py-2.5 rounded-xl ${toneClass}`}>{children}</div>;
}
