"use client";

import { useActionState, useRef } from "react";
import { toUserMessage } from "@/lib/user-error-message";
import { requestMedicationAuthorizationAction } from "./actions";

type State = { error: string } | { success: true } | null;

const inputClass =
  "min-h-11 border border-tata-border rounded-xl px-3 py-2 text-sm outline-none focus:border-tata-green transition-colors bg-tata-surface w-full";
const labelClass = "flex flex-col gap-1 text-xs font-semibold text-tata-ink-faint";

/** Dialog nativo autocontido — mesmo padrão visual de ActionDialogButton (cuidadora), mas essa tela vive
 * no portal dos pais e é acionada com pouca frequência, não vale a pena promover o componente da
 * cuidadora para compartilhado por causa de um único uso. */
export function RequestMedicationForm({ childId }: { childId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState<State, FormData>(async (_prev, formData) => {
    try {
      await requestMedicationAuthorizationAction(formData);
      formRef.current?.reset();
      setTimeout(() => dialogRef.current?.close(), 1200);
      return { success: true };
    } catch (error) {
      return { error: toUserMessage(error, "Não foi possível enviar. Tente novamente.") };
    }
  }, null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="min-h-11 w-full bg-tata-coral text-white rounded-xl px-4 py-2.5 font-[family-name:var(--font-baloo)] font-semibold text-sm transition-opacity hover:opacity-90"
      >
        + Cadastrar medicamento
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Cadastrar medicamento"
        className="rounded-tata-lg p-0 backdrop:bg-black/40 w-[calc(100%-2rem)] max-w-sm m-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className="p-5 flex flex-col gap-3 max-h-[85vh] overflow-y-auto tata-animate-pop">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-baloo)] font-semibold text-base text-tata-ink">
              Cadastrar medicamento
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

          {state && "success" in state ? (
            <p role="status" className="text-sm text-tata-green-dark font-semibold">
              ✓ Enviado! Este medicamento ficará pendente de confirmação pela escola.
            </p>
          ) : (
            <form ref={formRef} action={formAction} className="flex flex-col gap-3">
              <input type="hidden" name="childId" value={childId} />

              <label className={labelClass}>
                Nome do medicamento
                <input name="medication" required className={inputClass} />
              </label>
              <label className={labelClass}>
                Dosagem
                <input name="dosage" required placeholder="Ex: 5ml, 1 comprimido" className={inputClass} />
              </label>
              <label className={labelClass}>
                Horário (opcional)
                <input name="scheduleTime" placeholder="Ex: 14:00" className={inputClass} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className={labelClass}>
                  Início
                  <input name="validFrom" type="date" required className={inputClass} />
                </label>
                <label className={labelClass}>
                  Término (opcional)
                  <input name="validUntil" type="date" className={inputClass} />
                </label>
              </div>
              <label className={labelClass}>
                Orientações (opcional)
                <textarea name="instructions" rows={2} className={inputClass} />
              </label>

              <p className="text-xs text-tata-ink-muted">
                Este medicamento ficará pendente de confirmação pela escola.
              </p>

              {state && "error" in state && (
                <p role="alert" className="text-sm text-tata-coral-dark font-medium">
                  {state.error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="min-h-11 bg-tata-coral text-white rounded-xl px-4 py-2.5 font-[family-name:var(--font-baloo)] font-semibold text-sm disabled:opacity-60 transition-opacity"
              >
                {pending ? "Enviando..." : "Enviar para confirmação"}
              </button>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
