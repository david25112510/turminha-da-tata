import { connection } from "next/server";
import { LoginForm } from "./LoginForm";

/**
 * connection() força renderização dinâmica desta página (substitui `export const dynamic =
 * "force-dynamic"`, que não tem efeito confiável numa página "use client" nesta versão do Next.js — ver
 * node_modules/next/dist/docs/.../use-search-params.md). Necessário porque /login era pré-renderizada como
 * rota estática, e a resposta da Server Action de login (que grava o cookie de sessão) estava sendo
 * cacheada e reproduzida sem Set-Cookie em logins repetidos com as mesmas credenciais — quebrando a sessão
 * silenciosamente. Reproduzido isolado e confirmado corrigido antes de aplicar.
 */
export default async function LoginPage() {
  await connection();
  return <LoginForm />;
}
