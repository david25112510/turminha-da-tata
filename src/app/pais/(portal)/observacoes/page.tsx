import { prisma } from "@/lib/prisma";
import { requireGuardian, pickChildLink } from "@/lib/guardian";
import { CHILD_NOTE_STATUS_LABELS } from "@/lib/labels";
import { EmptyState } from "@/components/tata/EmptyState";
import { ChildSwitcher } from "../ChildSwitcher";
import { ObservationForm } from "./ObservationForm";

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

const STATUS_TONE: Record<string, string> = {
  NEW: "bg-tata-yellow/10 text-tata-yellow-dark",
  READ: "bg-tata-blue/10 text-tata-blue-dark",
  ANSWERED: "bg-tata-green/10 text-tata-green-dark",
  ARCHIVED: "bg-tata-ink-muted/10 text-tata-ink-muted",
};

export default async function GuardianObservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>;
}) {
  const { childId } = await searchParams;
  const guardian = await requireGuardian();
  const link = pickChildLink(guardian.children, childId);

  if (!link) {
    return <EmptyState message="Nenhuma criança vinculada à sua conta." />;
  }

  const notes = await prisma.childNote.findMany({
    where: { childId: link.childId, authorRole: "GUARDIAN", authorGuardianId: guardian.id },
    orderBy: { time: "desc" },
  });

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 max-w-2xl mx-auto">
      <ChildSwitcher basePath="/pais/observacoes" activeChildId={link.childId} guardianChildren={guardian.children} />

      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
        📝 Observações — {link.child.preferredName || link.child.fullName}
      </h1>

      <ObservationForm childId={link.childId} />

      {notes.length === 0 ? (
        <EmptyState message="Nenhuma observação enviada por aqui ainda 💛" withMascot />
      ) : (
        <div className="flex flex-col gap-2.5">
          {notes.map((note) => (
            <div key={note.id} className="bg-tata-surface rounded-tata-lg shadow-tata-card p-4 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-tata-ink-muted">{dateTimeFmt.format(note.time)}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_TONE[note.status]}`}>
                  {CHILD_NOTE_STATUS_LABELS[note.status]}
                </span>
              </div>
              <p className="text-sm text-tata-ink">{note.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
