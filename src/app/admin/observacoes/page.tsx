import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CHILD_NOTE_STATUS_LABELS } from "@/lib/labels";
import { EmptyState } from "@/components/tata/EmptyState";
import type { ChildNoteStatus } from "@prisma/client";
import { updateObservationStatusAction } from "./actions";

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

const TABS: { value: ChildNoteStatus | "ALL"; label: string }[] = [
  { value: "NEW", label: "Novas" },
  { value: "READ", label: "Lidas" },
  { value: "ANSWERED", label: "Respondidas" },
  { value: "ARCHIVED", label: "Arquivadas" },
  { value: "ALL", label: "Todas" },
];

const STATUS_TONE: Record<string, string> = {
  NEW: "bg-tata-yellow/10 text-tata-yellow-dark",
  READ: "bg-tata-blue/10 text-tata-blue-dark",
  ANSWERED: "bg-tata-green/10 text-tata-green-dark",
  ARCHIVED: "bg-tata-ink-muted/10 text-tata-ink-muted",
};

export default async function AdminObservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeTab = TABS.some((t) => t.value === status) ? (status as ChildNoteStatus | "ALL") : "NEW";

  const notes = await prisma.childNote.findMany({
    where: { authorRole: "GUARDIAN", ...(activeTab === "ALL" ? {} : { status: activeTab }) },
    orderBy: { time: "desc" },
    include: { child: true, authorGuardian: true },
  });

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">Observações das famílias</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/observacoes?status=${tab.value}`}
            className={`min-h-11 flex items-center px-4 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.value ? "bg-tata-coral text-white" : "bg-tata-surface text-tata-ink-soft hover:bg-tata-surface-hover"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {notes.length === 0 ? (
        <div className="bg-tata-surface rounded-2xl shadow-sm">
          <EmptyState message="Nenhuma observação nesta categoria." withMascot />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((note) => (
            <div key={note.id} className="bg-tata-surface rounded-2xl shadow-sm p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-tata-ink text-sm">
                    {note.child.preferredName || note.child.fullName}
                  </p>
                  <p className="text-xs text-tata-ink-muted">
                    {note.authorGuardian?.name} · {dateTimeFmt.format(note.time)}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_TONE[note.status]}`}>
                  {CHILD_NOTE_STATUS_LABELS[note.status]}
                </span>
              </div>

              <p className="text-sm text-tata-ink-soft">{note.text}</p>

              <div className="flex flex-wrap gap-2 pt-1">
                {note.status === "NEW" && (
                  <form action={updateObservationStatusAction}>
                    <input type="hidden" name="id" value={note.id} />
                    <input type="hidden" name="status" value="READ" />
                    <button type="submit" className="min-h-11 text-xs font-semibold text-tata-blue-dark px-2">
                      Marcar como lida
                    </button>
                  </form>
                )}
                {(note.status === "NEW" || note.status === "READ") && (
                  <form action={updateObservationStatusAction}>
                    <input type="hidden" name="id" value={note.id} />
                    <input type="hidden" name="status" value="ANSWERED" />
                    <button type="submit" className="min-h-11 text-xs font-semibold text-tata-green-dark px-2">
                      Marcar como respondida
                    </button>
                  </form>
                )}
                {note.status !== "ARCHIVED" && (
                  <form action={updateObservationStatusAction}>
                    <input type="hidden" name="id" value={note.id} />
                    <input type="hidden" name="status" value="ARCHIVED" />
                    <button type="submit" className="min-h-11 text-xs font-semibold text-tata-ink-muted px-2">
                      Arquivar
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
