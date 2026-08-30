"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "./actions";
import { HumanVerification } from "@/components/security/HumanVerification";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, undefined);

  return (
    <main className="min-h-screen flex items-center justify-center bg-tata-bg p-6">
      <div className="w-full max-w-sm bg-tata-surface rounded-[28px] shadow-xl p-8 flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
            Esqueci minha senha
          </h1>
          <p className="text-sm text-tata-ink-soft">
            Informe seu e-mail de acesso e enviaremos instruções para criar uma nova senha.
          </p>
        </div>

        {state?.message ? (
          <p role="status" className="text-sm text-tata-green-dark font-medium">
            {state.message}
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-tata-ink-strong">E-mail</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="nome@turminhadatata.com.br"
                className="min-h-11 border border-tata-border rounded-xl px-4 py-3 text-sm outline-none focus:border-tata-green transition-colors"
              />
            </label>

            {state?.error && (
              <p role="alert" className="text-sm text-tata-coral-dark font-medium">
                {state.error}
              </p>
            )}

            <HumanVerification pending={pending} />

            <button
              type="submit"
              disabled={pending}
              className="min-h-11 bg-tata-coral text-white rounded-xl py-3 font-[family-name:var(--font-baloo)] font-semibold text-sm disabled:opacity-60 transition-opacity"
            >
              {pending ? "Enviando..." : "Enviar instruções"}
            </button>
          </form>
        )}

        <Link href="/login" className="text-center text-sm text-tata-ink-soft hover:underline">
          Voltar para o login
        </Link>
      </div>
    </main>
  );
}
