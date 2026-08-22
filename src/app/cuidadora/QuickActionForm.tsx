"use client";

import { useActionState } from "react";

type ActionState = { success?: string; error?: string } | null;

const DEFAULT_BUTTON =
  "min-h-11 bg-[#1FA787] text-white text-sm font-semibold rounded-xl py-3 font-[family-name:var(--font-baloo)] disabled:opacity-60 transition-opacity";

/**
 * Wrapper genérico para os formulários de registro rápido: chama a Server Action recebida por prop e mostra
 * "Salvando...", depois "✓ <mensagem>" ou o erro (as Server Actions já lançam mensagens em português
 * apropriadas para o usuário — nunca stack trace). Evita recriar o mesmo estado de pending/feedback em cada
 * formulário (alimentação, higiene, atividade, ocorrência, saúde, medicamento).
 */
export function QuickActionForm({
  action,
  hiddenFields,
  successMessage,
  submitLabel,
  submitClassName,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  hiddenFields: Record<string, string>;
  successMessage: string;
  submitLabel: string;
  submitClassName?: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (_prev, formData) => {
    try {
      await action(formData);
      return { success: successMessage };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Não foi possível registrar. Tente novamente." };
    }
  }, null);

  return (
    <form action={formAction} className="flex flex-col gap-2.5">
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      <button type="submit" disabled={pending} className={submitClassName ?? DEFAULT_BUTTON}>
        {pending ? "Salvando..." : submitLabel}
      </button>
      {state?.success && (
        <p role="status" className="text-sm text-[#1F8A6E] font-semibold">
          ✓ {state.success}
        </p>
      )}
      {state?.error && (
        <p role="alert" className="text-sm text-[#E85570] font-medium">
          {state.error}
        </p>
      )}
    </form>
  );
}
