"use client";

import { useActionState, useState } from "react";
import { generateGuardianInviteAction, type GenerateGuardianInviteState } from "../actions";

/** Gera um convite de responsável — o código só existe nesta tela, uma vez, logo após ser criado. */
export function GenerateInviteButton({ childId }: { childId: string }) {
  const [state, formAction, pending] = useActionState<GenerateGuardianInviteState, FormData>(
    generateGuardianInviteAction,
    undefined
  );
  const [copied, setCopied] = useState(false);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard pode falhar por permissão do navegador — o código já está visível na tela.
    }
  }

  if (state && "code" in state) {
    return (
      <div className="bg-tata-yellow-soft rounded-xl p-3 flex flex-col gap-2">
        <p className="text-xs text-tata-ink-soft">
          Repasse este código pessoalmente à família — ele só aparece aqui uma vez e vale por 7 dias.
        </p>
        <div className="flex items-center gap-2">
          <code className="text-lg font-mono font-bold text-tata-ink tracking-widest">{state.code}</code>
          <button
            type="button"
            onClick={() => copyCode(state.code)}
            className="min-h-11 text-xs font-semibold text-tata-green-dark px-2"
          >
            {copied ? "✓ Copiado!" : "Copiar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="childId" value={childId} />
      {state && "error" in state && (
        <p role="alert" className="text-sm text-tata-coral-dark font-medium mb-2">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 bg-tata-surface border border-tata-border text-tata-ink-soft text-sm font-semibold rounded-xl px-4 font-[family-name:var(--font-baloo)] disabled:opacity-60"
      >
        {pending ? "Gerando..." : "+ Gerar convite para responsável"}
      </button>
    </form>
  );
}
