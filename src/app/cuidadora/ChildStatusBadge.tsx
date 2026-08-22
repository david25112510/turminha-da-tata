export type PresenceStatus = "waiting" | "present" | "left";

const CONFIG: Record<PresenceStatus, { icon: string; label: string; className: string }> = {
  waiting: { icon: "🟡", label: "Aguardando chegada", className: "bg-[#9A8A72]/10 text-[#8A7A62]" },
  present: { icon: "🟢", label: "Presente", className: "bg-[#1FA787]/10 text-[#1F8A6E]" },
  left: { icon: "🔵", label: "Saiu", className: "bg-[#4A90C2]/10 text-[#2F6E99]" },
};

/** Ícone + texto + cor sempre juntos — status nunca é indicado só por cor. */
export function ChildStatusBadge({ status }: { status: PresenceStatus }) {
  const { icon, label, className } = CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${className}`}>
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

/** Chip separado para ocorrência em aberto — independente da presença (uma criança pode estar presente e ter uma ocorrência). */
export function IncidentIndicator() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap bg-[#E85570]/10 text-[#C83F58]">
      <span aria-hidden="true">🔴</span>
      Ocorrência
    </span>
  );
}
