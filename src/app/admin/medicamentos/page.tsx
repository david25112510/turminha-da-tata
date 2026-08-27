import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MEDICATION_AUTHORIZATION_STATUS_LABELS, MEDICATION_AUTHORIZATION_STATUS_TONE } from "@/lib/labels";
import { EmptyState } from "@/components/tata/EmptyState";
import type { MedicationAuthorizationStatus } from "@prisma/client";
import {
  approveMedicationAuthorizationAction,
  refuseMedicationAuthorizationAction,
  pauseMedicationAuthorizationAction,
  resumeMedicationAuthorizationAction,
  endMedicationAuthorizationAction,
} from "./actions";

const dateFmt = new Intl.DateTimeFormat("pt-BR");

const TABS: { value: MedicationAuthorizationStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Pendentes" },
  { value: "ACTIVE", label: "Ativos" },
  { value: "PAUSED", label: "Pausados" },
  { value: "ENDED", label: "Encerrados" },
  { value: "REFUSED", label: "Recusados" },
  { value: "ALL", label: "Todos" },
];

export default async function AdminMedicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeTab = TABS.some((t) => t.value === status) ? (status as MedicationAuthorizationStatus | "ALL") : "PENDING";

  const authorizations = await prisma.medicationAuthorization.findMany({
    where: activeTab === "ALL" ? undefined : { status: activeTab },
    orderBy: { createdAt: "desc" },
    include: { child: true, authorizedBy: true },
  });

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">Medicamentos</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/medicamentos?status=${tab.value}`}
            className={`min-h-11 flex items-center px-4 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.value
                ? "bg-tata-coral text-white"
                : "bg-tata-surface text-tata-ink-soft hover:bg-tata-surface-hover"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {authorizations.length === 0 ? (
        <div className="bg-tata-surface rounded-2xl shadow-sm">
          <EmptyState message="Nenhum medicamento nesta categoria." withMascot />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {authorizations.map((auth) => (
            <div key={auth.id} className="bg-tata-surface rounded-2xl shadow-sm p-4 flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-tata-ink text-sm">
                    {auth.child.preferredName || auth.child.fullName} — {auth.medication}
                  </p>
                  <p className="text-xs text-tata-ink-soft">
                    {auth.dosage}
                    {auth.scheduleTime ? ` — ${auth.scheduleTime}` : ""} · solicitado por {auth.authorizedBy?.name ?? "—"}
                  </p>
                  <p className="text-xs text-tata-ink-muted">
                    {dateFmt.format(auth.validFrom)} {auth.validUntil ? `→ ${dateFmt.format(auth.validUntil)}` : "(sem data de término)"}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                    MEDICATION_AUTHORIZATION_STATUS_TONE[auth.status] ?? MEDICATION_AUTHORIZATION_STATUS_TONE.PENDING
                  }`}
                >
                  {MEDICATION_AUTHORIZATION_STATUS_LABELS[auth.status]}
                </span>
              </div>

              {auth.instructions && <p className="text-sm text-tata-ink-soft">{auth.instructions}</p>}

              <div className="flex flex-wrap gap-2 pt-1">
                {auth.status === "PENDING" && (
                  <>
                    <form action={approveMedicationAuthorizationAction}>
                      <input type="hidden" name="id" value={auth.id} />
                      <button
                        type="submit"
                        className="min-h-11 bg-tata-green text-white text-xs font-semibold rounded-xl px-4 font-[family-name:var(--font-baloo)]"
                      >
                        Confirmar
                      </button>
                    </form>
                    <details className="inline-block">
                      <summary className="min-h-11 flex items-center cursor-pointer text-xs font-semibold text-tata-coral-dark px-2">
                        Recusar
                      </summary>
                      <form action={refuseMedicationAuthorizationAction} className="flex gap-2 mt-2 items-center flex-wrap">
                        <input type="hidden" name="id" value={auth.id} />
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
                  </>
                )}

                {auth.status === "ACTIVE" && (
                  <>
                    <form action={pauseMedicationAuthorizationAction}>
                      <input type="hidden" name="id" value={auth.id} />
                      <button
                        type="submit"
                        className="min-h-11 bg-tata-surface border border-tata-border text-tata-ink-soft text-xs font-semibold rounded-xl px-4 font-[family-name:var(--font-baloo)]"
                      >
                        Pausar
                      </button>
                    </form>
                    <form action={endMedicationAuthorizationAction}>
                      <input type="hidden" name="id" value={auth.id} />
                      <button type="submit" className="min-h-11 text-xs font-semibold text-tata-coral-dark px-2">
                        Encerrar
                      </button>
                    </form>
                  </>
                )}

                {auth.status === "PAUSED" && (
                  <>
                    <form action={resumeMedicationAuthorizationAction}>
                      <input type="hidden" name="id" value={auth.id} />
                      <button
                        type="submit"
                        className="min-h-11 bg-tata-green text-white text-xs font-semibold rounded-xl px-4 font-[family-name:var(--font-baloo)]"
                      >
                        Retomar
                      </button>
                    </form>
                    <form action={endMedicationAuthorizationAction}>
                      <input type="hidden" name="id" value={auth.id} />
                      <button type="submit" className="min-h-11 text-xs font-semibold text-tata-coral-dark px-2">
                        Encerrar
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
