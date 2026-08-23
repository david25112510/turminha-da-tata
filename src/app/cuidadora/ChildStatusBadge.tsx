export type PresenceStatus = "waiting" | "present" | "left";

const CONFIG: Record<PresenceStatus, { icon: string; label: string; className: string }> = {
  waiting: { icon: "🟡", label: "Aguardando chegada", className: "bg-tata-ink-muted/10 text-tata-ink-muted-alt" },
  present: { icon: "🟢", label: "Presente", className: "bg-tata-green/10 text-tata-green-dark" },
  left: { icon: "🔵", label: "Saiu", className: "bg-tata-blue/10 text-tata-blue-dark" },
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
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap bg-tata-coral-dark/10 text-tata-coral-deep">
      <span aria-hidden="true">🔴</span>
      Ocorrência
    </span>
  );
}
