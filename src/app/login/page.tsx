"use client";

import { useActionState } from "react";
import Image from "next/image";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <main className="min-h-screen flex flex-col md:items-center md:justify-center bg-[#FFFBF2] md:p-6">
      <div className="w-full md:max-w-4xl md:flex md:rounded-[28px] md:overflow-hidden md:shadow-xl bg-white">
        {/* Mobile: faixa compacta com a mascote no topo, em vez do formulário flutuando isolado no meio da tela */}
        <div className="flex md:hidden flex-col items-center gap-2 bg-[#1FA787] px-6 pt-10 pb-8 rounded-b-[32px]">
          <div className="relative w-20 h-24">
            <Image
              src="/images/tata-mascote.png"
              alt="Tata, mascote da Turminha da Tata"
              fill
              sizes="80px"
              className="object-contain"
              priority
            />
          </div>
          <div className="flex items-baseline gap-1.5 font-[family-name:var(--font-baloo)] font-bold text-xl text-[#FFFDF8]">
            <span>Turminha</span>
            <span>Tata</span>
          </div>
        </div>

        <div className="hidden md:flex w-[380px] flex-col justify-between bg-[#1FA787] p-10 relative">
          <div className="flex items-baseline gap-2 font-[family-name:var(--font-baloo)] font-bold text-2xl text-[#FFFDF8]">
            <span>Turminha</span>
            <span className="text-sm opacity-80">da</span>
            <span>Tata</span>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="relative w-44 h-56">
              <Image
                src="/images/tata-mascote.png"
                alt="Tata, mascote da Turminha da Tata"
                fill
                sizes="176px"
                className="object-contain"
                priority
              />
            </div>
            <p className="text-center text-sm text-[#FFFDF8]/90 max-w-[220px]">
              Cuidado, segurança e alegria acompanhando cada criança, todos os dias.
            </p>
          </div>

          <p className="text-xs text-[#FFFDF8]/70">© 2026 Turminha da Tata</p>
        </div>

        <div className="flex-1 flex flex-col justify-center p-6 md:p-10">
          <form action={formAction} className="w-full max-w-sm mx-auto flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-2xl text-[#2E2418]">
                Bem-vinda de volta
              </h1>
              <p className="text-sm text-[#6B5D4A]">Entre para acessar o sistema.</p>
            </div>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-[#4A3F33]">E-mail</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="nome@turminhadatata.com.br"
                className="min-h-11 border border-[#ECE1CB] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1FA787] transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-[#4A3F33]">Senha</span>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••"
                className="min-h-11 border border-[#ECE1CB] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1FA787] transition-colors"
              />
            </label>

            {state?.error && (
              <p role="alert" className="text-sm text-[#E85570] font-medium">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="min-h-11 bg-[#FF6F8E] text-white rounded-xl py-3 font-[family-name:var(--font-baloo)] font-semibold text-sm disabled:opacity-60 transition-opacity"
            >
              {pending ? "Entrando..." : "Entrar"}
            </button>

            <p className="text-center text-xs text-[#9A8A72]">
              Acesso restrito à equipe da Turminha da Tata
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
