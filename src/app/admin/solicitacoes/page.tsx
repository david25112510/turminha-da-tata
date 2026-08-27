import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RELATIONSHIP_LABELS, ROLE_LABELS } from "@/lib/labels";
import { EmptyState } from "@/components/tata/EmptyState";
import type { SignupRequestStatus } from "@prisma/client";
import { approveSignupRequestAction, rejectSignupRequestAction } from "./actions";

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

const TABS: { value: SignupRequestStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Pendentes" },
  { value: "APPROVED", label: "Aprovadas" },
  { value: "REJECTED", label: "Recusadas" },
  { value: "ALL", label: "Todas" },
];

export default async function AdminSignupRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeTab = TABS.some((t) => t.value === status) ? (status as SignupRequestStatus | "ALL") : "PENDING";

  const requests = await prisma.signupRequest.findMany({
    where: activeTab === "ALL" ? undefined : { status: activeTab },
    orderBy: { createdAt: "desc" },
    include: { invite: { include: { child: true } } },
  });

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
        Solicitações de cadastro
      </h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/solicitacoes?status=${tab.value}`}
            className={`min-h-11 flex items-center px-4 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.value ? "bg-tata-coral text-white" : "bg-tata-surface text-tata-ink-soft hover:bg-tata-surface-hover"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="bg-tata-surface rounded-2xl shadow-sm">
          <EmptyState message="Nenhuma solicitação nesta categoria." withMascot />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((request) => (
            <div key={request.id} className="bg-tata-surface rounded-2xl shadow-sm p-4 flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-tata-ink text-sm">{request.name}</p>
                  <p className="text-xs text-tata-ink-soft">
                    {request.email} · {request.phone}
                  </p>
                  <p className="text-xs text-tata-ink-muted">
                    {ROLE_LABELS[request.role]}
                    {request.role === "GUARDIAN" && request.invite && (
                      <>
                        {" "}— {request.invite.child.preferredName || request.invite.child.fullName}
                        {request.relationship ? ` (${RELATIONSHIP_LABELS[request.relationship]})` : ""}
                      </>
                    )}
                  </p>
                  <p className="text-[10px] text-tata-ink-muted">{dateTimeFmt.format(request.createdAt)}</p>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                    request.status === "PENDING"
                      ? "bg-tata-yellow/10 text-tata-yellow-dark"
                      : request.status === "APPROVED"
                        ? "bg-tata-green/10 text-tata-green-dark"
                        : "bg-tata-coral/10 text-tata-coral-dark"
                  }`}
                >
                  {request.status === "PENDING" ? "Pendente" : request.status === "APPROVED" ? "Aprovada" : "Recusada"}
                </span>
              </div>

              {request.status === "REJECTED" && request.reviewNotes && (
                <p className="text-xs text-tata-coral-dark">Motivo: {request.reviewNotes}</p>
              )}

              {request.status === "PENDING" && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <form action={approveSignupRequestAction}>
                    <input type="hidden" name="id" value={request.id} />
                    <button
                      type="submit"
                      className="min-h-11 bg-tata-green text-white text-xs font-semibold rounded-xl px-4 font-[family-name:var(--font-baloo)]"
                    >
                      Aprovar
                    </button>
                  </form>
                  <details className="inline-block">
                    <summary className="min-h-11 flex items-center cursor-pointer text-xs font-semibold text-tata-coral-dark px-2">
                      Recusar
                    </summary>
                    <form action={rejectSignupRequestAction} className="flex gap-2 mt-2 items-center flex-wrap">
                      <input type="hidden" name="id" value={request.id} />
                      <input
                        name="reason"
                        required
                        placeholder="Motivo da recusa"
                        className="min-h-11 border border-tata-border rounded-xl px-3 py-2 text-xs bg-tata-surface"
                      />
                      <button
                        type="submit"
                        className="min-h-11 bg-tata-coral-dark text-white text-xs font-semibold rounded-xl px-4 font-[family-name:var(--font-baloo)]"
                      >
                        Confirmar recusa
                      </button>
                    </form>
                  </details>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
