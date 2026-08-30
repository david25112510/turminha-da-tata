import Link from "next/link";
import type { getDashboardData } from "@/lib/dashboard";

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const dateTime = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function ArrowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-tata-green-dark underline-offset-4 transition-colors hover:text-tata-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-tata-green">{children}<span aria-hidden="true">→</span></Link>;
}

export function AdminOverviewHeader({ name, attentionCount }: { name: string; attentionCount: number }) {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23" }).format(now));
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const formattedDate = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long" }).format(now);
  return <header className="border-b border-tata-border pb-6 lg:flex lg:items-end lg:justify-between">
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-tata-green-dark">Central de operação</p>
      <h1 className="font-[family-name:var(--font-baloo)] text-3xl font-semibold tracking-tight text-tata-ink sm:text-4xl">{greeting}, {name.split(" ")[0]}.</h1>
      <p className="mt-1 text-sm capitalize text-tata-ink-muted-alt">{formattedDate}</p>
    </div>
    <OperationalStatus attentionCount={attentionCount} />
  </header>;
}

function OperationalStatus({ attentionCount }: { attentionCount: number }) {
  const healthy = attentionCount === 0;
  return <div className="mt-5 flex items-start gap-3 lg:mt-0 lg:max-w-sm lg:justify-end">
    <span aria-hidden="true" className={`mt-1.5 size-2.5 shrink-0 rounded-full ${healthy ? "bg-tata-green" : "bg-tata-yellow"}`} />
    <div>
      <p className="text-sm font-semibold text-tata-ink">{healthy ? "Operação dentro do esperado" : "Operação com pendências"}</p>
      <p className="mt-0.5 text-sm text-tata-ink-muted-alt">{healthy ? "Nenhum ponto crítico exige ação agora." : `${attentionCount} ${attentionCount === 1 ? "ponto precisa" : "pontos precisam"} da sua atenção.`}</p>
    </div>
  </div>;
}

export function TodayOperations({ indicators }: { indicators: DashboardData["indicators"] }) {
  return <section aria-labelledby="today-title" className="p-5 sm:p-7 lg:col-span-7 lg:p-8">
    <div className="flex items-center justify-between gap-4">
      <h2 id="today-title" className="text-xs font-bold uppercase tracking-[0.14em] text-tata-ink-muted-alt">Operação de hoje</h2>
      <ArrowLink href="/admin/rotina">Ver operação</ArrowLink>
    </div>
    <div className="mt-7 grid gap-7 sm:grid-cols-[minmax(0,1.2fr)_minmax(240px,1fr)] sm:items-end">
      <div className="border-l-4 border-tata-green pl-5">
        <p className="font-[family-name:var(--font-baloo)] text-5xl font-semibold leading-none text-tata-ink sm:text-6xl">{indicators.stillAtSchool}</p>
        <p className="mt-2 max-w-xs text-base font-medium text-tata-ink-soft">crianças estão na unidade agora</p>
        <p className="mt-1 text-xs text-tata-ink-muted-alt">de {indicators.totalChildren} crianças ativas</p>
      </div>
      <dl className="grid grid-cols-2 border-y border-tata-border">
        <OperationMetric value={indicators.entriesToday} label="entradas" />
        <OperationMetric value={indicators.exitsToday} label="saídas" border />
        <OperationMetric value={indicators.notArrived} label="ainda não chegaram" top />
        <OperationMetric value={indicators.caregiversActive} label="cadastros de cuidadoras" top border />
      </dl>
    </div>
  </section>;
}

function OperationMetric({ value, label, border, top }: { value: number; label: string; border?: boolean; top?: boolean }) {
  return <div className={`py-4 ${border ? "border-l border-tata-border pl-5" : "pr-5"} ${top ? "border-t border-tata-border" : ""}`}><dt className="text-xs text-tata-ink-muted-alt">{label}</dt><dd className="mt-1 font-[family-name:var(--font-baloo)] text-2xl font-semibold text-tata-ink">{String(value).padStart(2, "0")}</dd></div>;
}

export function AttentionPanel({ data }: { data: DashboardData }) {
  const items = [
    data.enrollments.submitted ? { label: "Matrícula", text: `${data.enrollments.submitted} ${data.enrollments.submitted === 1 ? "solicitação aguarda" : "solicitações aguardam"} análise`, href: "/admin/matriculas", tone: "attention" } : null,
    data.medications.pending ? { label: "Medicamento", text: `${data.medications.pending} ${data.medications.pending === 1 ? "autorização está" : "autorizações estão"} sem administração hoje`, href: "/admin/medicamentos", tone: "attention" } : null,
    data.financial.overdueCount ? { label: "Financeiro", text: `${data.financial.overdueCount} ${data.financial.overdueCount === 1 ? "mensalidade vencida" : "mensalidades vencidas"}`, href: "/admin/financeiro", tone: "critical" } : null,
  ].filter(Boolean) as Array<{ label: string; text: string; href: string; tone: string }>;
  const incident = data.alerts.openIncidents[0];
  return <section aria-labelledby="attention-title" className="border-t border-tata-border bg-tata-surface-warm p-5 sm:p-7 lg:col-span-5 lg:border-l lg:border-t-0 lg:p-8">
    <div className="flex items-center justify-between gap-4"><h2 id="attention-title" className="text-xs font-bold uppercase tracking-[0.14em] text-tata-ink-muted-alt">Atenção agora</h2><span className="text-xs font-semibold text-tata-ink-muted-alt">{items.length + (incident ? 1 : 0)} categorias</span></div>
    {incident && <Link href={`/admin/criancas/${incident.childId}`} className="mt-5 block border-l-4 border-tata-coral-dark bg-tata-surface px-4 py-3 transition-colors hover:bg-tata-coral-soft focus-visible:outline-2 focus-visible:outline-tata-coral-dark"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-tata-coral-deep">Ocorrência em aberto · {dateTime.format(incident.time)}</p><p className="mt-1 font-semibold text-tata-ink">{incident.child.preferredName || incident.child.fullName}</p><p className="mt-1 line-clamp-2 text-sm text-tata-ink-soft">{incident.description}</p></Link>}
    {items.length ? <div className="mt-4 divide-y divide-tata-border border-y border-tata-border">{items.map((item) => <Link key={item.label} href={item.href} className="group flex min-h-14 items-center gap-3 py-3 transition-colors hover:bg-tata-surface-hover focus-visible:outline-2 focus-visible:outline-tata-green"><span className={`w-[72px] shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] ${item.tone === "critical" ? "text-tata-coral-deep" : "text-tata-yellow-dark"}`}>{item.label}</span><span className="flex-1 text-sm text-tata-ink-soft group-hover:text-tata-ink">{item.text}</span><span aria-hidden="true" className="text-tata-ink-muted-alt">→</span></Link>)}</div> : !incident ? <div className="mt-8 border-y border-tata-border py-8 text-center"><p className="font-semibold text-tata-green-dark">Nenhuma pendência crítica.</p><p className="mt-1 text-sm text-tata-ink-muted-alt">A operação está dentro do esperado.</p></div> : null}
  </section>;
}

export function DailyFlow({ flow }: { flow: DashboardData["operation"]["flow"] }) {
  const max = Math.max(1, ...flow.flatMap((bucket) => [bucket.entries, bucket.exits]));
  return <section aria-labelledby="flow-title" className="border-y border-tata-border py-7 sm:py-8">
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="flow-title" className="font-[family-name:var(--font-baloo)] text-xl font-semibold text-tata-ink">Movimento do dia</h2><p className="mt-1 text-sm text-tata-ink-muted-alt">Entradas e saídas registradas por faixa de horário.</p></div><div className="flex gap-5 text-xs text-tata-ink-muted-alt"><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-tata-green" />Entradas</span><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-tata-ink-soft" />Saídas</span></div></div>
    <div className="grid grid-cols-7 gap-2 sm:gap-4">{flow.map((bucket) => <div key={bucket.label} className="flex min-w-0 flex-col items-center"><div className="flex h-24 w-full max-w-16 items-end justify-center gap-1 border-b border-tata-border px-1"><span title={`${bucket.entries} entradas`} className="w-2.5 rounded-t-sm bg-tata-green transition-[height] duration-200 sm:w-4" style={{ height: bucket.entries ? `${Math.max(12, bucket.entries / max * 100)}%` : "2px" }} /><span title={`${bucket.exits} saídas`} className="w-2.5 rounded-t-sm bg-tata-ink-soft transition-[height] duration-200 sm:w-4" style={{ height: bucket.exits ? `${Math.max(12, bucket.exits / max * 100)}%` : "2px" }} /></div><span className="mt-2 text-[10px] font-semibold text-tata-ink-muted-alt sm:text-xs">{bucket.label}</span></div>)}</div>
  </section>;
}

export function EnrollmentSummary({ enrollments }: { enrollments: DashboardData["enrollments"] }) {
  return <section aria-labelledby="enrollment-title" className="rounded-[14px] border border-tata-border bg-tata-surface p-5 lg:col-span-4 lg:p-6"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-tata-green-dark">Entrada de novas famílias</p><h2 id="enrollment-title" className="mt-2 font-[family-name:var(--font-baloo)] text-xl font-semibold text-tata-ink">Matrículas</h2><div className="mt-5 grid grid-cols-3 divide-x divide-tata-border border-y border-tata-border py-4 text-center"><SummaryNumber value={enrollments.newToday} label="novas hoje" /><SummaryNumber value={enrollments.underReview} label="em análise" /><SummaryNumber value={enrollments.approvedThisMonth} label="aprovadas no mês" /></div>{enrollments.latest ? <div className="mt-5"><p className="text-[10px] font-bold uppercase tracking-wider text-tata-ink-muted-alt">Solicitação mais recente</p><p className="mt-1 font-semibold text-tata-ink">{enrollments.latest.childPreferredName || enrollments.latest.childFullName}</p><p className="text-xs text-tata-ink-muted-alt">{enrollments.latest.submittedAt ? dateTime.format(enrollments.latest.submittedAt) : "Data não informada"}</p></div> : <p className="mt-5 text-sm text-tata-ink-muted-alt">Nenhuma matrícula aguardando análise.</p>}<div className="mt-4"><ArrowLink href="/admin/matriculas">Ver todas</ArrowLink></div></section>;
}

function SummaryNumber({ value, label }: { value: number; label: string }) { return <div className="px-2"><p className="font-[family-name:var(--font-baloo)] text-2xl font-semibold text-tata-ink">{value}</p><p className="mt-1 text-[10px] leading-tight text-tata-ink-muted-alt">{label}</p></div>; }

export function FinancialOverview({ financial, monthLabel }: { financial: DashboardData["financial"]; monthLabel: string }) {
  return <section aria-labelledby="financial-title" className="rounded-[14px] border border-tata-border bg-tata-ink p-5 text-tata-surface lg:col-span-5 lg:p-6"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-tata-green-soft">Financeiro · {monthLabel}</p><h2 id="financial-title" className="sr-only">Visão financeira</h2><dl className="mt-5 grid gap-5 sm:grid-cols-2"><div><dt className="text-xs text-tata-border">Recebido no mês</dt><dd className="mt-1 font-[family-name:var(--font-baloo)] text-3xl font-semibold">{currency(financial.received)}</dd></div><div className="sm:border-l sm:border-white/15 sm:pl-5"><dt className="text-xs text-tata-border">Em aberto</dt><dd className="mt-1 font-[family-name:var(--font-baloo)] text-2xl font-semibold">{currency(financial.open)}</dd></div></dl><div className="mt-6 flex items-center justify-between border-y border-white/15 py-3"><span className="text-xs text-tata-border">Vencido</span><strong className={financial.overdue > 0 ? "text-tata-coral" : "text-tata-green-soft"}>{currency(financial.overdue)}</strong></div><div className="mt-4"><Link href="/admin/financeiro" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-tata-green-soft hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Abrir financeiro <span aria-hidden="true">→</span></Link></div></section>;
}

export function MedicationOverview({ medications }: { medications: DashboardData["medications"] }) {
  return <section aria-labelledby="medication-title" className="rounded-[14px] border border-tata-border bg-tata-surface p-5 lg:col-span-3 lg:p-6"><h2 id="medication-title" className="font-[family-name:var(--font-baloo)] text-xl font-semibold text-tata-ink">Medicamentos</h2><dl className="mt-5 divide-y divide-tata-border border-y border-tata-border"><CompactMetric label="Autorizações ativas" value={medications.authorized} /><CompactMetric label="Administrados hoje" value={medications.administered} /><CompactMetric label="Sem administração hoje" value={medications.pending} alert={medications.pending > 0} /></dl><div className="mt-4"><ArrowLink href="/admin/medicamentos">Ver medicamentos</ArrowLink></div></section>;
}

function CompactMetric({ label, value, alert }: { label: string; value: number; alert?: boolean }) { return <div className="flex items-center justify-between gap-3 py-3"><dt className="text-xs text-tata-ink-muted-alt">{label}</dt><dd className={`font-semibold ${alert ? "text-tata-coral-deep" : "text-tata-ink"}`}>{value}</dd></div>; }

export function RoutineSummary({ routine }: { routine: DashboardData["routine"] }) {
  const records = [["Alimentações", routine.meals], ["Cochilos", routine.sleeps], ["Água", routine.water], ["Atividades", routine.activities], ["Higiene", routine.hygiene], ["Fraldas", routine.diapers], ["Fotos", routine.photos], ["Saúde", routine.observations]];
  return <section aria-labelledby="routine-title" className="rounded-[14px] border border-tata-border bg-tata-surface p-5 lg:col-span-8 lg:p-6"><div className="flex items-end justify-between gap-4"><div><h2 id="routine-title" className="font-[family-name:var(--font-baloo)] text-xl font-semibold text-tata-ink">Registros de hoje</h2><p className="mt-1 text-sm text-tata-ink-muted-alt">Uma leitura rápida da rotina registrada pela equipe.</p></div><ArrowLink href="/admin/rotina">Ver rotina</ArrowLink></div><dl className="mt-6 grid grid-cols-2 gap-px border-y border-tata-border bg-tata-border sm:grid-cols-4">{records.map(([label, value]) => <div key={label} className="bg-tata-surface px-3 py-4"><dt className="text-[11px] text-tata-ink-muted-alt">{label}</dt><dd className="mt-1 font-[family-name:var(--font-baloo)] text-2xl font-semibold text-tata-green-dark">{value}</dd></div>)}</dl></section>;
}

export function CareTeamStatus({ team }: { team: DashboardData["caregiverTeam"] }) {
  return <section aria-labelledby="team-title" className="rounded-[14px] border border-tata-border bg-tata-surface-warm p-5 lg:col-span-4 lg:p-6"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-tata-ink-muted-alt">Equipe cadastrada</p><h2 id="team-title" className="mt-2 font-[family-name:var(--font-baloo)] text-xl font-semibold text-tata-ink">{team.length} {team.length === 1 ? "cuidadora ativa" : "cuidadoras ativas"}</h2>{team.length ? <ul className="mt-5 divide-y divide-tata-border border-y border-tata-border">{team.slice(0, 5).map((caregiver) => <li key={caregiver.id} className="flex items-center gap-3 py-3"><span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-tata-green-soft text-xs font-bold text-tata-green-dark">{caregiver.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</span><span className="truncate text-sm font-medium text-tata-ink-soft">{caregiver.name}</span></li>)}</ul> : <p className="mt-5 text-sm text-tata-ink-muted-alt">Nenhuma cuidadora ativa cadastrada.</p>}<div className="mt-4"><ArrowLink href="/admin/cuidadoras">Ver equipe</ArrowLink></div></section>;
}
