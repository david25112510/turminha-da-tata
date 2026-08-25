"use client";

import { useActionState, useEffect } from "react";
import { MOOD_LABELS } from "@/lib/labels";
import { useDialogClose } from "../../DialogContext";
import { toUserMessage } from "@/lib/user-error-message";

const AUTO_CLOSE_DELAY_MS = 900;

type ActionState = { success?: string; error?: string } | null;

const MOOD_EMOJI: Record<string, string> = {
  VERY_HAPPY: "😀",
  HAPPY: "🙂",
  GOOD: "😊",
  NORMAL: "😐",
  TIRED: "😴",
  SAD: "😟",
  CRIED: "😢",
  IRRITATED: "😡",
  OTHER: "🤔",
};

/** Um toque = salvo (seção 16): cada emoji já é o próprio botão de envio, sem tela extra de confirmação. */
export function MoodSelector({ childId, action }: { childId: string; action: (formData: FormData) => Promise<void> }) {
  const closeDialog = useDialogClose();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (_prev, formData) => {
    try {
      await action(formData);
      return { success: "Humor registrado" };
    } catch (error) {
      return { error: toUserMessage(error, "Não foi possível registrar. Tente novamente.") };
    }
  }, null);

  useEffect(() => {
    if (!state?.success || !closeDialog) return;
    const timer = setTimeout(closeDialog, AUTO_CLOSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state?.success, closeDialog]);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(MOOD_LABELS).map(([value, label]) => (
          <form key={value} action={formAction}>
            <input type="hidden" name="childId" value={childId} />
            <input type="hidden" name="mood" value={value} />
            <button
              type="submit"
              disabled={pending}
              aria-label={label}
              title={label}
              className="min-h-11 w-full flex flex-col items-center gap-0.5 border border-tata-border rounded-xl py-2 text-2xl hover:border-tata-green disabled:opacity-60 transition-colors"
            >
              <span aria-hidden="true">{MOOD_EMOJI[value] ?? "🙂"}</span>
              <span className="text-[9px] font-semibold text-tata-ink-muted leading-none">{label}</span>
            </button>
          </form>
        ))}
      </div>
      {state?.success && (
        <p role="status" className="text-sm text-tata-green-dark font-semibold">
          ✓ {state.success}
        </p>
      )}
      {state?.error && (
        <p role="alert" className="text-sm text-tata-coral-dark font-medium">
          {state.error}
        </p>
      )}
    </div>
  );
}
