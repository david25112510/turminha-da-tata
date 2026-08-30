import { auth } from "@/auth";
import { getDashboardData } from "@/lib/dashboard";
import {
  AdminOverviewHeader,
  AttentionPanel,
  CareTeamStatus,
  DailyFlow,
  EnrollmentSummary,
  FinancialOverview,
  MedicationOverview,
  RoutineSummary,
  TodayOperations,
} from "@/components/admin/AdminDashboard";

export default async function AdminHome() {
  const [session, data] = await Promise.all([auth(), getDashboardData()]);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", month: "long" }).format(new Date());

  return (
    <div className="min-h-full bg-tata-surface-alt px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
      <div className="mx-auto flex max-w-[1560px] flex-col gap-7 lg:gap-8">
        <AdminOverviewHeader name={session?.user?.name || "Administração"} attentionCount={data.operation.attentionCount} />
        <div className="grid overflow-hidden rounded-[14px] border border-tata-border bg-tata-surface lg:grid-cols-12">
          <TodayOperations indicators={data.indicators} />
          <AttentionPanel data={data} />
        </div>
        <DailyFlow flow={data.operation.flow} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-5">
          <EnrollmentSummary enrollments={data.enrollments} />
          <FinancialOverview financial={data.financial} monthLabel={monthLabel} />
          <MedicationOverview medications={data.medications} />
          <RoutineSummary routine={data.routine} />
          <CareTeamStatus team={data.caregiverTeam} />
        </div>
      </div>
    </div>
  );
}
