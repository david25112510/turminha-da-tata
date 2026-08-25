"use client";

import { useMemo, useState } from "react";
import { MEAL_TYPE_LABELS } from "@/lib/labels";
import { GuardianRoutineTimeline, type TimelineEntry } from "./GuardianRoutineTimeline";

type Category = "todos" | "alimentacao" | "sono" | "higiene" | "atividades" | "saude" | "fotos";

const MEAL_LABELS = new Set<string>(Object.values(MEAL_TYPE_LABELS));

const FILTERS: { value: Category; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "alimentacao", label: "Alimentação" },
  { value: "sono", label: "Sono" },
  { value: "higiene", label: "Higiene" },
  { value: "atividades", label: "Atividades" },
  { value: "saude", label: "Saúde" },
  { value: "fotos", label: "Fotos" },
];

function categorize(entry: TimelineEntry): Category {
  if (entry.label === "Soneca") return "sono";
  if (entry.label === "Higiene") return "higiene";
  if (entry.label === "Atividade") return "atividades";
  if (entry.label === "Foto") return "fotos";
  if (entry.label === "Humor" || entry.label === "Saúde" || entry.label === "Ocorrência" || entry.label === "Medicamento") return "saude";
  if (MEAL_LABELS.has(entry.label)) return "alimentacao";
  return "todos"; // Chegada/Saída — informação de contexto, não é "tipo de registro" para filtrar
}

/** Filtro local (sem nova consulta) sobre a timeline já carregada — mesmo padrão de ChildrenSearch.tsx da cuidadora. */
export function TimelineFilter({ entries }: { entries: TimelineEntry[] }) {
  const [active, setActive] = useState<Category>("todos");

  const filtered = useMemo(() => {
    if (active === "todos") return entries;
    return entries.filter((e) => categorize(e) === active || categorize(e) === "todos");
  }, [entries, active]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setActive(f.value)}
            aria-pressed={active === f.value}
            className={`min-h-11 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              active === f.value ? "bg-tata-green text-white" : "bg-tata-surface text-tata-ink-soft border border-tata-border"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <GuardianRoutineTimeline entries={filtered} />
    </div>
  );
}
