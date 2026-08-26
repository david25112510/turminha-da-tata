import { prisma } from "@/lib/prisma";
import { requireGuardian, pickChildLink } from "@/lib/guardian";
import { MEDICATION_AUTHORIZATION_STATUS_LABELS, MEDICATION_AUTHORIZATION_STATUS_TONE } from "@/lib/labels";
import { EmptyState } from "@/components/tata/EmptyState";
import { ChildSwitcher } from "../ChildSwitcher";
import { RequestMedicationForm } from "./RequestMedicationForm";

const dateFmt = new Intl.DateTimeFormat("pt-BR");
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default async function GuardianMedicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>;
}) {
  const { childId } = await searchParams;
  const guardian = await requireGuardian();
  const link = pickChildLink(guardian.children, childId);

  if (!link) {
    return <div className="p-8 text-sm text-tata-ink-muted-alt">Nenhuma criança vinculada à sua conta.</div>;
  }

  if (!link.authorizeMedication) {
    return (
      <div className="p-8 text-sm text-tata-ink-muted-alt">
        Você não tem permissão para gerenciar medicamentos desta criança.
      </div>
    );
  }

  const authorizations = await prisma.medicationAuthorization.findMany({
    where: { childId: link.childId },
    orderBy: { createdAt: "desc" },
    include: { administrations: { orderBy: { time: "desc" }, take: 5 } },
  });

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <ChildSwitcher basePath="/pais/medicamentos" activeChildId={link.childId} guardianChildren={guardian.children} />

      <div className="flex items-center justify-between gap-2">
        <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
          💊 Medicamentos — {link.child.preferredName || link.child.fullName}
        </h1>
      </div>

      <RequestMedicationForm childId={link.childId} />

      {authorizations.length === 0 ? (
        <EmptyState message="Nenhum medicamento cadastrado por aqui ainda 💛" withMascot />
      ) : (
        <div className="flex flex-col gap-3">
          {authorizations.map((auth) => {
            const toneClass = MEDICATION_AUTHORIZATION_STATUS_TONE[auth.status] ?? MEDICATION_AUTHORIZATION_STATUS_TONE.PENDING;
            return (
              <div key={auth.id} className="bg-tata-surface rounded-tata-lg shadow-tata-card p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-tata-ink">
                      {auth.medication}
                    </p>
                    <p className="text-xs text-tata-ink-soft">{auth.dosage}{auth.scheduleTime ? ` — ${auth.scheduleTime}` : ""}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${toneClass}`}>
                    {MEDICATION_AUTHORIZATION_STATUS_LABELS[auth.status]}
                  </span>
                </div>

                <p className="text-xs text-tata-ink-muted">
                  {dateFmt.format(auth.validFrom)} {auth.validUntil ? `→ ${dateFmt.format(auth.validUntil)}` : "(sem data de término)"}
                </p>

                {auth.instructions && <p className="text-sm text-tata-ink-soft">{auth.instructions}</p>}

                {auth.status === "REFUSED" && auth.reviewNotes && (
                  <p className="text-xs text-tata-coral-dark">Motivo da recusa: {auth.reviewNotes}</p>
                )}

                {auth.administrations.length > 0 && (
                  <details className="mt-1">
                    <summary className="text-xs font-semibold text-tata-green cursor-pointer">
                      Histórico de administração
                    </summary>
                    <div className="flex flex-col gap-1 mt-2">
                      {auth.administrations.map((a) => (
                        <div key={a.id} className="text-xs text-tata-ink-soft flex justify-between">
                          <span>{dateTimeFmt.format(a.time)}</span>
                          {a.notes && <span className="text-tata-ink-muted">{a.notes}</span>}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
