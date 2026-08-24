"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPasswordAction } from "./actions";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, formAction, pending] = useActionState(resetPasswordAction, undefined);

  if (!token) {
    return (
      <p role="alert" className="text-sm text-tata-coral-dark font-medium">
        Link de recuperação inválido.
      </p>
    );
  }

  if (state && "success" in state) {
    return (
      <>
        <p role="status" className="text-sm text-tata-green-dark font-medium">
          Senha alterada com sucesso. Você já pode entrar com a nova senha.
        </p>
        <Link
          href="/login"
          className="min-h-11 flex items-center justify-center bg-tata-coral text-white rounded-xl py-3 font-[family-name:var(--font-baloo)] font-semibold text-sm"
        >
          Ir para o login
        </Link>
      </>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-tata-ink-strong">Nova senha</span>
        <input
          type="password"
          name="newPassword"
          required
          minLength={8}
          autoComplete="new-password"
          className="min-h-11 border border-tata-border rounded-xl px-4 py-3 text-sm outline-none focus:border-tata-green transition-colors"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-tata-ink-strong">Confirmar nova senha</span>
        <input
          type="password"
          name="confirmPassword"
          required
          minLength={8}
          autoComplete="new-password"
          className="min-h-11 border border-tata-border rounded-xl px-4 py-3 text-sm outline-none focus:border-tata-green transition-colors"
        />
      </label>

      {state && "error" in state && (
        <p role="alert" className="text-sm text-tata-coral-dark font-medium">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 bg-tata-coral text-white rounded-xl py-3 font-[family-name:var(--font-baloo)] font-semibold text-sm disabled:opacity-60 transition-opacity"
      >
        {pending ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}

export function ResetPasswordFormPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-tata-bg p-6">
      <div className="w-full max-w-sm bg-tata-surface rounded-[28px] shadow-xl p-8 flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
            Criar nova senha
          </h1>
        </div>

        <Suspense fallback={<p className="text-sm text-tata-ink-muted">Carregando...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
