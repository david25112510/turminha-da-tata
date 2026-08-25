import { prisma } from "@/lib/prisma";
import { ANNOUNCEMENT_TYPE_LABELS, ANNOUNCEMENT_TYPE_TONE, ANNOUNCEMENT_TARGET_LABELS } from "@/lib/labels";
import { createAnnouncementAction } from "./actions";
import { EmptyState } from "@/components/tata/EmptyState";

const inputClass =
  "min-h-11 border border-tata-border rounded-xl px-3 py-2 text-sm outline-none focus:border-tata-green transition-colors bg-tata-surface";

export default async function AnnouncementsPage() {
  const [announcements, guardians, children] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      include: { targetGuardian: true, targetChild: true },
      take: 30,
    }),
    prisma.guardian.findMany({ orderBy: { name: "asc" } }),
    prisma.child.findMany({ where: { status: "ACTIVE" }, orderBy: { fullName: "asc" } }),
  ]);

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6 max-w-3xl">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
        Comunicados
      </h1>

      <form
        action={createAnnouncementAction}
        className="bg-tata-surface rounded-2xl shadow-sm p-5 flex flex-col gap-3 border-l-4 border-l-tata-coral"
      >
        <input name="title" placeholder="Título" required className={inputClass} />
        <textarea name="body" placeholder="Mensagem" required rows={3} className={inputClass} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select name="type" className={inputClass} defaultValue="ANNOUNCEMENT">
            {Object.entries(ANNOUNCEMENT_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select name="target" className={inputClass} defaultValue="ALL">
            {Object.entries(ANNOUNCEMENT_TARGET_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input type="date" name="eventDate" className={inputClass} title="Data do evento (opcional)" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select name="targetGuardianId" className={inputClass} defaultValue="">
            <option value="">Responsável (se aplicável)</option>
            {guardians.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <select name="targetChildId" className={inputClass} defaultValue="">
            <option value="">Criança (se aplicável)</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>{c.preferredName || c.fullName}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="self-start bg-tata-coral text-white rounded-xl px-6 py-2.5 font-[family-name:var(--font-baloo)] font-semibold text-sm"
        >
          Publicar
        </button>
      </form>

      {announcements.length === 0 ? (
        <div className="bg-tata-surface rounded-tata-lg shadow-tata-card">
          <EmptyState message="Nenhum comunicado publicado ainda." withMascot />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-tata-surface rounded-tata-lg shadow-tata-card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-tata-ink">
                  {a.title}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ANNOUNCEMENT_TYPE_TONE[a.type]}`}>
                  {ANNOUNCEMENT_TYPE_LABELS[a.type]}
                </span>
              </div>
              <p className="text-sm text-tata-ink-soft">{a.body}</p>
              <p className="text-xs text-tata-ink-muted mt-2">
                {ANNOUNCEMENT_TARGET_LABELS[a.target]}
                {a.targetGuardian ? ` — ${a.targetGuardian.name}` : ""}
                {a.targetChild ? ` — ${a.targetChild.preferredName || a.targetChild.fullName}` : ""}
                {a.eventDate ? ` — ${new Intl.DateTimeFormat("pt-BR").format(a.eventDate)}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
