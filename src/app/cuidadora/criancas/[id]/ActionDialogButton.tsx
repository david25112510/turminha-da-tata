"use client";

import { useId, useRef } from "react";

/**
 * Botão grande de ação rápida (grade 2 colunas, alvo de toque ≥44px) que abre um <dialog> nativo com o
 * formulário correspondente — foco/ESC/backdrop de graça, sem biblioteca de modal.
 */
export function ActionDialogButton({
  icon,
  label,
  dialogTitle,
  children,
}: {
  icon: string;
  label: string;
  dialogTitle: string;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="min-h-24 flex flex-col items-center justify-center gap-1 bg-[#FFFDF8] rounded-2xl shadow-sm py-4 text-[#2E2418] hover:shadow-md transition-shadow"
      >
        <span className="text-2xl" aria-hidden="true">{icon}</span>
        <span className="text-xs font-semibold font-[family-name:var(--font-baloo)]">{label}</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="rounded-2xl p-0 backdrop:bg-black/40 w-[calc(100%-2rem)] max-w-sm m-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className="p-5 flex flex-col gap-3 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 id={titleId} className="font-[family-name:var(--font-baloo)] font-semibold text-base text-[#2E2418]">
              {dialogTitle}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Fechar"
              className="min-h-11 min-w-11 flex items-center justify-center text-[#9A8A72] text-lg"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}
