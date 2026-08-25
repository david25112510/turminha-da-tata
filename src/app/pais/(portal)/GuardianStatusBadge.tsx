export type ChildPresenceStatus = "waiting" | "present" | "left";

const CONFIG: Record<ChildPresenceStatus, { icon: string; label: string; className: string }> = {
  waiting: { icon: "🟡", label: "Ainda não chegou", className: "bg-tata-ink-muted/10 text-tata-ink-muted-alt" },
  present: { icon: "🟢", label: "Na Turminha da Tata", className: "bg-tata-green/10 text-tata-green-dark" },
  left: { icon: "🔵", label: "Já saiu", className: "bg-tata-blue/10 text-tata-blue-dark" },
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
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full whitespace-nowrap bg-tata-coral-dark/10 text-tata-coral-deep">
      <span aria-hidden="true">🔴</span>
      {label}
    </span>
  );
}
