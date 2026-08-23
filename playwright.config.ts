import "dotenv/config";
import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * Testes E2E dos fluxos críticos (ver e2e/*.spec.ts) — login por papel, o fluxo completo da cuidadora pelo
 * celular, e isolamento de dados entre famílias. Não substitui os testes unitários (npm run test); cobre
 * exatamente o que só se prova com um navegador real batendo no servidor de verdade.
 *
 * Requer Postgres rodando e DATABASE_URL configurado (mesmo banco do `npm run dev` — global-setup.ts cria
 * dados próprios prefixados "e2e-" e global-teardown.ts os remove; nunca toca em dados reais).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // Um worker só: o servidor de dev (Turbopack) compila rotas sob demanda na primeira requisição — duas
  // rotas diferentes compilando ao mesmo tempo em workers concorrentes derruba o tempo de resposta do login
  // além do timeout. Suíte pequena, contra um servidor de dev local; não vale a pena paralelizar.
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL,
    viewport: { width: 390, height: 844 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
