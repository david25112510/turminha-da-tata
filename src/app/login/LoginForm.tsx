"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { DevFooter } from "@/components/tata/DevFooter";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <main className="min-h-screen flex flex-col md:items-center md:justify-center bg-tata-bg md:p-6">
      <div className="w-full md:max-w-4xl md:flex md:rounded-[28px] md:overflow-hidden md:shadow-xl bg-tata-surface">
        {/* Mobile: faixa compacta com a mascote no topo, em vez do formulário flutuando isolado no meio da tela */}
        <div className="flex md:hidden flex-col items-center gap-2 bg-tata-green px-6 pt-10 pb-8 rounded-b-[32px]">
          <div className="relative w-20 h-24 tata-mascot-idle">
            <Image
              src="/images/tata-mascote.png"
              alt="Tata, mascote da Turminha da Tata"
              fill
              sizes="80px"
              className="object-contain"
              priority
            />
          </div>
          <div className="flex items-baseline gap-1.5 font-[family-name:var(--font-baloo)] font-bold text-xl text-tata-surface">
            <span>Turminha</span>
            <span>Tata</span>
          </div>
        </div>

        <div className="hidden md:flex w-[380px] flex-col justify-between bg-tata-green p-10 relative">
          <div className="flex items-baseline gap-2 font-[family-name:var(--font-baloo)] font-bold text-2xl text-tata-surface">
            <span>Turminha</span>
            <span className="text-sm opacity-80">da</span>
            <span>Tata</span>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="relative w-44 h-56 tata-mascot-idle">
              <Image
                src="/images/tata-mascote.png"
                alt="Tata, mascote da Turminha da Tata"
                fill
                sizes="176px"
                className="object-contain"
                priority
              />
            </div>
            <p className="text-center text-sm text-tata-surface/90 max-w-[220px]">
              Cuidado, segurança e alegria acompanhando cada criança, todos os dias.
            </p>
          </div>

          <p className="text-xs text-tata-surface/70">© 2026 Turminha da Tata</p>
        </div>

        <div className="flex-1 flex flex-col justify-center p-6 md:p-10">
          <form action={formAction} className="w-full max-w-sm mx-auto flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-2xl text-tata-ink">
                {state?.mfaRequired ? "Verificação em duas etapas" : "Bem-vinda de volta"}
              </h1>
              <p className="text-sm text-tata-ink-soft">
                {state?.mfaRequired ? "Sua conta tem autenticação em duas etapas ativada." : "Entre para acessar o sistema."}
              </p>
            </div>

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

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-tata-ink-strong">Senha</span>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••"
                readOnly={state?.mfaRequired}
                className="min-h-11 border border-tata-border rounded-xl px-4 py-3 text-sm outline-none focus:border-tata-green transition-colors read-only:bg-tata-surface-hover"
              />
              {!state?.mfaRequired && (
                <Link href="/esqueci-senha" className="self-end text-xs font-semibold text-tata-ink-soft hover:underline">
                  Esqueci minha senha
                </Link>
              )}
            </label>

            {state?.mfaRequired && (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-tata-ink-strong">Código de autenticação</span>
                <input
                  type="text"
                  name="totpCode"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="000000"
                  className="min-h-11 border border-tata-border rounded-xl px-4 py-3 text-sm tracking-[0.3em] text-center outline-none focus:border-tata-green transition-colors"
                />
                <p className="text-xs text-tata-ink-muted">Digite o código de 6 dígitos do seu app autenticador.</p>
              </label>
            )}

            {state?.error && (
              <p role="alert" className="text-sm text-tata-coral-dark font-medium">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="min-h-11 bg-tata-coral text-white rounded-xl py-3 font-[family-name:var(--font-baloo)] font-semibold text-sm disabled:opacity-60 transition-opacity"
            >
              {pending ? "Entrando..." : state?.mfaRequired ? "Confirmar código" : "Entrar"}
            </button>

            {!state?.mfaRequired && (
              <p className="text-center text-xs text-tata-ink-muted">
                Ainda não tem conta?{" "}
                <Link href="/cadastro" className="font-semibold text-tata-green-dark hover:underline">
                  Criar conta
                </Link>
              </p>
            )}

            <p className="text-center text-xs text-tata-ink-muted">
              Acesso restrito à equipe da Turminha da Tata
            </p>
          </form>
        </div>
      </div>

      <DevFooter className="py-4" />
    </main>
  );
}
