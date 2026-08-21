import { prisma } from "@/lib/prisma";
import { ANNOUNCEMENT_TYPE_LABELS, ANNOUNCEMENT_TARGET_LABELS } from "@/lib/labels";
import { createAnnouncementAction } from "./actions";

const inputClass =
  "border border-[#ECE1CB] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#1FA787] transition-colors bg-white";

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
    <div className="p-8 flex flex-col gap-6 max-w-3xl">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
        Comunicados
      </h1>

      <form
        action={createAnnouncementAction}
        className="bg-[#FFFDF8] rounded-2xl shadow-sm p-5 flex flex-col gap-3"
      >
        <input name="title" placeholder="Título" required className={inputClass} />
        <textarea name="body" placeholder="Mensagem" required rows={3} className={inputClass} />

        <div className="grid grid-cols-3 gap-3">
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

        <div className="grid grid-cols-2 gap-3">
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
          className="self-start bg-[#FF6F8E] text-white rounded-xl px-6 py-2.5 font-[family-name:var(--font-baloo)] font-semibold text-sm"
        >
          Publicar
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {announcements.map((a) => (
          <div key={a.id} className="bg-[#FFFDF8] rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-[family-name:var(--font-baloo)] font-semibold text-sm text-[#2E2418]">
                {a.title}
              </span>
              <span className="text-xs font-semibold text-[#1F8A6E] bg-[#1FA787]/10 px-2 py-0.5 rounded-full">
                {ANNOUNCEMENT_TYPE_LABELS[a.type]}
              </span>
            </div>
            <p className="text-sm text-[#6B5D4A]">{a.body}</p>
            <p className="text-xs text-[#9A8A72] mt-2">
              {ANNOUNCEMENT_TARGET_LABELS[a.target]}
              {a.targetGuardian ? ` — ${a.targetGuardian.name}` : ""}
              {a.targetChild ? ` — ${a.targetChild.preferredName || a.targetChild.fullName}` : ""}
              {a.eventDate ? ` — ${new Intl.DateTimeFormat("pt-BR").format(a.eventDate)}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
