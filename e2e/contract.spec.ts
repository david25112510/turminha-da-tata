import { expect, type Page, test } from "@playwright/test";
import { E2E_ADMIN, E2E_PASSWORD } from "./fixtures";

const CHILD_PREFERRED_NAME = "E2E Contrato Kid";
const GUARDIAN_EMAIL = "e2e-contract-guardian@turminhadatata.com.br";
const GUARDIAN_PASSWORD = "SenhaInicial123!";

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.fill('input[name="email"]', E2E_ADMIN.email);
  await page.fill('input[name="password"]', E2E_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 10_000 });
}

/**
 * Fluxo completo do contrato digital pela UI real (seção "TESTES" do pedido): cadastrar criança e
 * responsável gera o contrato automaticamente; o responsável cai em /pais/contrato em vez do portal
 * normal; só depois de aceitar é que o portal abre. Cria sua própria criança/responsável (não reaproveita
 * E2E_CHILD_A/B) e não publica nenhuma nova versão de contrato — a regra "nova versão gera pendência só
 * para vínculos ativos" já é coberta por src/app/admin/contratos/actions.test.ts a nível de unidade, de
 * propósito: publicar uma versão nova aqui afetaria TODOS os vínculos ativos do banco (inclusive os
 * guardians fixos A/B usados por outros specs), o que quebraria a suíte inteira dependendo da ordem de
 * execução dos arquivos.
 */
test("cadastro de criança e responsável gera contrato pendente; portal só abre após o aceite", async ({ page }) => {
  test.setTimeout(60_000);

  await loginAsAdmin(page);

  await page.goto("/admin/criancas/nova");
  await page.fill('input[name="fullName"]', "E2E Contrato Kid Completo");
  await page.fill('input[name="preferredName"]', CHILD_PREFERRED_NAME);
  await page.fill('input[name="birthDate"]', "2022-01-01");
  await page.fill('input[name="monthlyFee"]', "900,00");
  await page.fill('input[name="overtimeHourRate"]', "15,00");
  await page.click('button:has-text("Salvar")');
  await page.waitForURL("**/admin/criancas");

  await page.goto("/admin/responsaveis/novo");
  await page.fill('input[name="name"]', "E2E Responsável Contrato");
  await page.fill('input[name="cpf"]', "11122233344");
  await page.fill('input[name="phone"]', "11966666666");
  await page.fill('input[name="email"]', GUARDIAN_EMAIL);
  await page.selectOption('select[name="childId"]', { label: CHILD_PREFERRED_NAME });
  await page.check('input[name="createPortalAccess"]');
  await page.fill('input[name="tempPassword"]', GUARDIAN_PASSWORD);
  await page.click('button:has-text("Salvar")');
  await page.waitForURL("**/admin/responsaveis");

  // Login como o novo responsável: cai em /pais/contrato, não em /pais — o contrato foi gerado
  // automaticamente ao vincular o responsável à criança (ensureContractAcceptance).
  await page.goto("/login");
  await page.fill('input[name="email"]', GUARDIAN_EMAIL);
  await page.fill('input[name="password"]', GUARDIAN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/pais/contrato", { timeout: 10_000 });

  await expect(page.getByText(CHILD_PREFERRED_NAME)).toBeVisible();

  const acceptButton = page.getByRole("button", { name: "ACEITAR CONTRATO" });
  await expect(acceptButton).toBeDisabled();

  await page.check('input[name="agreed"]');
  await expect(acceptButton).toBeEnabled();
  await acceptButton.click();

  await expect(page.getByText("Contrato aceito com sucesso!")).toBeVisible({ timeout: 10_000 });

  await page.click('a:has-text("Continuar para o Portal")');
  await page.waitForURL("**/pais", { timeout: 10_000 });
  // Confirma que o portal realmente abriu (não foi bloqueado de novo por engano).
  await expect(page).toHaveURL(/\/pais$/);
});
