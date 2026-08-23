export type ChildPresenceStatus = "waiting" | "present" | "left";

const CONFIG: Record<ChildPresenceStatus, { icon: string; label: string; className: string }> = {
  waiting: { icon: "🟡", label: "Ainda não chegou", className: "bg-[#9A8A72]/10 text-[#8A7A62]" },
  present: { icon: "🟢", label: "Na Turminha da Tata", className: "bg-[#1FA787]/10 text-[#1F8A6E]" },
  left: { icon: "🔵", label: "Já saiu", className: "bg-[#4A90C2]/10 text-[#2F6E99]" },
};

/** Ícone + texto + cor sempre juntos — status nunca é indicado só por cor (mesmo padrão do app da cuidadora). */
export function GuardianStatusBadge({ status }: { status: ChildPresenceStatus }) {
  const { icon, label, className } = CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${className}`}>
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

/** Chip de atenção — ocorrência em aberto, independente da presença. */
export function AttentionIndicator({ label = "Atenção" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full whitespace-nowrap bg-[#E85570]/10 text-[#C83F58]">
      <span aria-hidden="true">🔴</span>
      {label}
    </span>
  );
}
