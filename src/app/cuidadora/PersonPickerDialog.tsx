"use client";

import { useActionState, useId, useRef } from "react";
import { RELATIONSHIP_LABELS } from "@/lib/labels";
import { toUserMessage } from "@/lib/user-error-message";

export type PersonOption = { value: string; name: string; relationship: string };

type ActionState = { error: string } | null;

/**
 * Seletor de responsável/pessoa autorizada como lista de botões grandes (um toque = envia), em vez de um
 * <select>. Cada botão é seu próprio <form> apontando para a Server Action recebida por prop (checkInAction
 * ou checkOutAction) — a validação de quem pode retirar continua 100% no servidor, isto só troca a UI.
 */
export function PersonPickerDialog({
  triggerLabel,
  triggerClassName,
  dialogTitle,
  childId,
  people,
  action,
}: {
  triggerLabel: string;
  triggerClassName: string;
  dialogTitle: string;
  childId: string;
  people: PersonOption[];
  action: (formData: FormData) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (_prev, formData) => {
    try {
      await action(formData);
      dialogRef.current?.close();
      return null;
    } catch (error) {
      return { error: toUserMessage(error, "Não foi possível registrar. Tente novamente.") };
    }
  }, null);

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => dialogRef.current?.showModal()}>
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="rounded-2xl p-0 backdrop:bg-black/40 w-[calc(100%-2rem)] max-w-sm m-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className="p-5 flex flex-col gap-3">
          <h2 id={titleId} className="font-[family-name:var(--font-baloo)] font-semibold text-base text-tata-ink">
            {dialogTitle}
          </h2>

          {people.length === 0 ? (
            <p className="text-sm text-tata-ink-muted-alt">Nenhum responsável ou pessoa autorizada cadastrada.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {people.map((p) => (
                <form key={p.value} action={formAction}>
                  <input type="hidden" name="childId" value={childId} />
                  <input type="hidden" name="personRef" value={p.value} />
                  <button
                    type="submit"
                    disabled={pending}
                    className="min-h-11 w-full text-left flex items-center gap-2 border border-tata-border rounded-xl px-4 py-3 text-sm font-semibold text-tata-ink hover:border-tata-green disabled:opacity-60 transition-colors"
                  >
                    <span>{p.name}</span>
                    <span className="text-xs font-normal text-tata-ink-muted">
                      — {RELATIONSHIP_LABELS[p.relationship] ?? p.relationship}
                    </span>
                  </button>
                </form>
              ))}
            </div>
          )}

          {state?.error && (
            <p role="alert" className="text-sm text-tata-coral-dark font-medium">
              {state.error}
            </p>
          )}

          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="min-h-11 text-xs font-semibold text-tata-ink-muted"
          >
            Cancelar
          </button>
        </div>
      </dialog>
    </>
  );
}
