"use client";

import { useActionState, useRef } from "react";
import { toUserMessage } from "@/lib/user-error-message";
import { sendObservationAction } from "./actions";

type State = { error: string } | { success: true } | null;

export function ObservationForm({ childId }: { childId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState<State, FormData>(async (_prev, formData) => {
    try {
      await sendObservationAction(formData);
      formRef.current?.reset();
      return { success: true };
    } catch (error) {
      return { error: toUserMessage(error, "Não foi possível enviar. Tente novamente.") };
    }
  }, null);

  return (
    <form ref={formRef} action={formAction} className="bg-tata-surface rounded-tata-lg shadow-tata-card p-4 flex flex-col gap-3">
      <input type="hidden" name="childId" value={childId} />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-tata-ink-strong">Enviar observação para a escola</span>
        <textarea
          name="text"
          required
          rows={3}
          placeholder="Ex: Maria dormiu tarde ontem, pode ficar mais sonolenta hoje."
          className="border border-tata-border rounded-xl px-3 py-2 text-sm outline-none focus:border-tata-green transition-colors bg-tata-surface resize-none"
        />
      </label>

      {state && "success" in state && (
        <p role="status" className="text-sm text-tata-green-dark font-semibold">
          ✓ Observação enviada para a escola.
        </p>
      )}
      {state && "error" in state && (
        <p role="alert" className="text-sm text-tata-coral-dark font-medium">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start min-h-11 bg-tata-coral text-white rounded-xl px-5 py-2.5 font-[family-name:var(--font-baloo)] font-semibold text-sm disabled:opacity-60 transition-opacity"
      >
        {pending ? "Enviando..." : "Enviar"}
      </button>
    </form>
  );
}
