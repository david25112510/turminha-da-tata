"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatTime } from "@/lib/date";
import { ChildStatusBadge, IncidentIndicator, type PresenceStatus } from "./ChildStatusBadge";
import { PersonPickerDialog, type PersonOption } from "./PersonPickerDialog";

export type ChildRow = {
  id: string;
  name: string;
  status: PresenceStatus;
  checkInTime: Date | null;
  hasOpenIncident: boolean;
  people: PersonOption[];
};

/** Busca local (sem consulta ao banco por tecla) sobre a lista já carregada pelo Server Component. */
export function ChildrenSearch({
  rows,
  checkInAction,
  checkOutAction,
}: {
  rows: ChildRow[];
  checkInAction: (formData: FormData) => Promise<void>;
  checkOutAction: (formData: FormData) => Promise<void>;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) => c.name.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="flex flex-col gap-3">
      <label className="relative">
        <span className="sr-only">Buscar criança pelo nome</span>
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A8A72]" aria-hidden="true">
          🔎
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar criança"
          className="w-full min-h-11 border border-[#ECE1CB] rounded-xl pl-10 pr-3 py-2.5 text-sm outline-none focus:border-[#1FA787] transition-colors bg-white"
        />
      </label>

      {filtered.length === 0 ? (
        <p className="text-sm text-[#8A7A62] px-1">Nenhuma criança encontrada para &quot;{query}&quot;.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((child) => (
            <div key={child.id} className="bg-[#FFFDF8] rounded-2xl shadow-sm p-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/cuidadora/criancas/${child.id}`}
                  className="font-[family-name:var(--font-baloo)] font-semibold text-[#2E2418] hover:text-[#1FA787] min-h-11 flex items-center"
                >
                  {child.name}
                </Link>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  <ChildStatusBadge status={child.status} />
                  {child.hasOpenIncident && <IncidentIndicator />}
                </div>
              </div>

              {child.checkInTime && (
                <p className="text-xs text-[#9A8A72]">Entrada {formatTime(child.checkInTime)}</p>
              )}

              {child.status === "waiting" && (
                <PersonPickerDialog
                  childId={child.id}
                  people={child.people}
                  action={checkInAction}
                  dialogTitle={`Quem trouxe ${child.name}?`}
                  triggerLabel="Registrar chegada"
                  triggerClassName="min-h-11 bg-[#1FA787] text-white text-sm font-semibold rounded-xl font-[family-name:var(--font-baloo)]"
                />
              )}
              {child.status === "present" && (
                <PersonPickerDialog
                  childId={child.id}
                  people={child.people}
                  action={checkOutAction}
                  dialogTitle={`Quem está buscando ${child.name}?`}
                  triggerLabel="Registrar saída"
                  triggerClassName="min-h-11 bg-[#FF6F8E] text-white text-sm font-semibold rounded-xl font-[family-name:var(--font-baloo)]"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
