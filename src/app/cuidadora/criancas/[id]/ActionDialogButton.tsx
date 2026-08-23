"use client";

import { useId, useRef } from "react";
import { DialogCloseProvider } from "../../DialogContext";

type Accent = "coral" | "blue" | "yellow" | "lilac" | "green";

const ACCENT_CIRCLE: Record<Accent, string> = {
  coral: "bg-tata-coral-soft",
  blue: "bg-tata-blue-soft",
  yellow: "bg-tata-yellow-soft",
  lilac: "bg-tata-lilac-soft",
  green: "bg-tata-green-soft",
};

/**
 * Botão grande de ação rápida (grade 2 colunas, alvo de toque ≥44px) que abre um <dialog> nativo com o
 * formulário correspondente — foco/ESC/backdrop de graça, sem biblioteca de modal. Ícone dentro de um
 * círculo colorido (accent) para dar hierarquia visual rápida em ambiente de trabalho corrido.
 */
export function ActionDialogButton({
  icon,
  label,
  dialogTitle,
  accent = "coral",
  children,
}: {
  icon: string;
  label: string;
  dialogTitle: string;
  accent?: Accent;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const closeDialog = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="min-h-24 flex flex-col items-center justify-center gap-1.5 bg-tata-surface rounded-tata-lg shadow-tata-card py-4 text-tata-ink transition-all hover:shadow-tata-card-hover active:scale-[0.97]"
      >
        <span className={`w-11 h-11 rounded-full flex items-center justify-center text-2xl ${ACCENT_CIRCLE[accent]}`} aria-hidden="true">
          {icon}
        </span>
        <span className="text-xs font-semibold font-[family-name:var(--font-baloo)]">{label}</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="rounded-tata-lg p-0 backdrop:bg-black/40 w-[calc(100%-2rem)] max-w-sm m-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className="p-5 flex flex-col gap-3 max-h-[80vh] overflow-y-auto tata-animate-pop">
          <div className="flex items-center justify-between">
            <h2 id={titleId} className="font-[family-name:var(--font-baloo)] font-semibold text-base text-tata-ink">
              {dialogTitle}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Fechar"
              className="min-h-11 min-w-11 flex items-center justify-center text-tata-ink-muted text-lg"
            >
              ✕
            </button>
          </div>
          <DialogCloseProvider value={closeDialog}>{children}</DialogCloseProvider>
        </div>
      </dialog>
    </>
  );
}
