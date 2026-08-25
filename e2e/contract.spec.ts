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

/** Desenha um traço simples no canvas de assinatura via mouse — o suficiente para sair do estado "vazio". */
async function drawSignature(page: Page) {
  const canvas = page.locator('canvas[aria-label*="assinatura"]');
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas de assinatura não encontrado.");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 15, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    const x = box.x + 15 + (box.width - 30) * (i / 10);
    const offset = i % 2 === 0 ? -30 : 30;
    await page.mouse.move(x, y + offset);
  }
  await page.mouse.up();
}

/**
 * Fluxo completo do contrato digital pela UI real (seção "TESTES" do pedido): cadastrar criança e
 * responsável gera o contrato automaticamente; o responsável cai em /pais/contrato em vez do portal
 * normal; lê, assina com o mouse (simula dedo/caneta — mesma API de Pointer Events), confirma e só
 * depois disso é que o portal abre; o contrato assinado fica visível tanto para o responsável
 * (/pais/documentos) quanto para o admin (/admin/contratos/[id]). Cria sua própria criança/responsável
 * (não reaproveita E2E_CHILD_A/B) e não publica nenhuma nova versão de contrato — a regra "nova versão
 * gera pendência só para vínculos ativos" já é coberta por src/app/admin/contratos/actions.test.ts a
 * nível de unidade, de propósito: publicar uma versão nova aqui afetaria TODOS os vínculos ativos do
 * banco (inclusive os guardians fixos A/B usados por outros specs), o que quebraria a suíte inteira
 * dependendo da ordem de execução dos arquivos.
 */
test("cadastro de criança e responsável gera contrato pendente; assinatura + aceite liberam o portal", async ({ page }) => {
  test.setTimeout(90_000);

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

  // Passo 1 — ler e marcar ciência.
  const continueButton = page.locator('button:has-text("Continuar"):visible');
  await expect(continueButton).toBeDisabled();
  await page.getByLabel("Li e compreendi o conteúdo deste contrato.").check();
  await expect(continueButton).toBeEnabled();
  await continueButton.click();

  // Passo 2 — assinar. Botão "Continuar" começa desabilitado (canvas vazio) e libera após o traço.
  await expect(page.locator('button:has-text("Continuar"):visible')).toBeDisabled();
  await drawSignature(page);
  await expect(page.locator('button:has-text("Continuar"):visible')).toBeEnabled();
  await page.locator('button:has-text("Continuar"):visible').click();

  // Passo 3 — confirmar e finalizar.
  await expect(page.getByText("Você está prestes a aceitar o contrato")).toBeVisible();
  await page.click('button:has-text("FINALIZAR E ACEITAR CONTRATO")');

  await expect(page.getByText("Contrato aceito com sucesso!")).toBeVisible({ timeout: 10_000 });

  await page.click('a:has-text("Continuar para o Portal")');
  await page.waitForURL("**/pais", { timeout: 10_000 });
  // Confirma que o portal realmente abriu (não foi bloqueado de novo por engano).
  await expect(page).toHaveURL(/\/pais$/);

  // O contrato assinado fica disponível em Perfil → Documentos, para este responsável.
  await page.goto("/pais/documentos");
  await page.locator("a", { hasText: `Contrato — ${CHILD_PREFERRED_NAME}` }).click();
  await page.waitForURL(/\/pais\/documentos\/.+/, { timeout: 10_000 });
  await expect(page.getByRole("img", { name: /Assinatura/ })).toBeVisible({ timeout: 10_000 });

  // E o admin consegue ver a mesma assinatura na ficha do contrato.
  await loginAsAdmin(page);
  await page.goto(`/admin/contratos?q=${encodeURIComponent(CHILD_PREFERRED_NAME)}`);
  await page.locator("a", { hasText: CHILD_PREFERRED_NAME }).click();
  await page.waitForURL(/\/admin\/contratos\/.+/, { timeout: 10_000 });
  await expect(page.getByText("Assinado:")).toContainText("✓ Sim", { timeout: 10_000 });
  await expect(page.getByRole("img", { name: /Assinatura/ })).toBeVisible({ timeout: 10_000 });
});
