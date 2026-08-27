"use client";

import { useActionState, useRef } from "react";
import { toUserMessage } from "@/lib/user-error-message";

type State = { error: string } | null;

/**
 * Confirmação forte para exclusão permanente — exige digitar o nome exato da entidade antes de
 * habilitar o envio (não só um clique de confirmação). Reutilizado por crianças, responsáveis e
 * cuidadoras (src/app/admin/*). A Server Action decide o que exatamente é apagado/preservado em
 * cascata — este componente só cuida do gate de confirmação e do feedback de erro.
 */
export function DeleteConfirmDialog({
  action,
  hiddenFields,
  entityLabel,
  entityName,
  warning,
  triggerLabel = "Excluir",
  triggerClassName = "min-h-11 text-xs font-semibold text-tata-coral-dark px-2",
}: {
  action: (formData: FormData) => Promise<void>;
  hiddenFields: Record<string, string>;
  entityLabel: string;
  entityName: string;
  warning?: string;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState<State, FormData>(async (_prev, formData) => {
    try {
      await action(formData);
      dialogRef.current?.close();
      return null;
    } catch (error) {
      return { error: toUserMessage(error, "Não foi possível excluir. Tente novamente.") };
    }
  }, null);

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className={triggerClassName}>
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        aria-label={`Excluir ${entityLabel}`}
        className="rounded-tata-lg p-0 backdrop:bg-black/40 w-[calc(100%-2rem)] max-w-sm m-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className="p-5 flex flex-col gap-3 tata-animate-pop">
          <h2 className="font-[family-name:var(--font-baloo)] font-semibold text-base text-tata-coral-dark">
            Excluir {entityLabel}?
          </h2>
          <p className="text-sm text-tata-ink-soft">
            Esta ação é <strong>permanente e não pode ser desfeita</strong>.{warning ? ` ${warning}` : ""}
          </p>
          <p className="text-sm text-tata-ink-soft">
            Para confirmar, digite <strong>{entityName}</strong> abaixo.
          </p>

          <form action={formAction} className="flex flex-col gap-3">
            {Object.entries(hiddenFields).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
            <input
              ref={inputRef}
              name="confirmName"
              required
              autoComplete="off"
              placeholder={entityName}
              className="min-h-11 border border-tata-coral rounded-xl px-3 py-2 text-sm outline-none focus:border-tata-coral-dark transition-colors bg-tata-surface"
            />

            {state?.error && (
              <p role="alert" className="text-sm text-tata-coral-dark font-medium">
                {state.error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="flex-1 min-h-11 border border-tata-border text-tata-ink-soft rounded-xl text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 min-h-11 bg-tata-coral-dark text-white rounded-xl text-sm font-semibold disabled:opacity-60 transition-opacity"
              >
                {pending ? "Excluindo..." : "Excluir definitivamente"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
