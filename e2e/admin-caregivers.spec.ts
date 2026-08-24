import { expect, type Page, test } from "@playwright/test";
import { E2E_ADMIN, E2E_PASSWORD } from "./fixtures";

const NEW_CAREGIVER_EMAIL = "e2e-new-caregiver@turminhadatata.com.br";
const NEW_CAREGIVER_PASSWORD = "SenhaInicial123!";

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.fill('input[name="email"]', E2E_ADMIN.email);
  await page.fill('input[name="password"]', E2E_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 10_000 });
}

/**
 * Fluxo completo de gestão de cuidadoras pelo admin (seções 4-8 e 17 do spec): cadastrar, a cuidadora
 * recém-criada conseguir logar, o admin desativá-la, e a cuidadora desativada não conseguir mais logar.
 *
 * Antes marcado test.fixme sob a hipótese de um bug de framework (prisma.create() dentro de Server
 * Action derrubando a sessão). Não era isso: o seletor 'button[type="submit"]' usado para submeter o
 * formulário também casava com o botão "Sair" do header/sidebar do admin (mesmo tipo de botão, sempre
 * presente no layout autenticado) — clicava em "Sair" em vez de "Salvar", deslogando o admin, o que
 * parecia exatamente uma sessão perdida. Corrigido apontando para o botão certo (linha abaixo); não há
 * bug de framework nenhum.
 */
test("admin cadastra cuidadora, ela loga, admin desativa e o login passa a ser recusado", async ({ page }) => {
  // Timeout maior que o padrão (30s): este teste encadeia 4 logins reais e várias navegações completas
  // (cria, verifica lista, loga como a nova cuidadora, loga de volta como admin, desativa, tenta logar de
  // novo) — mais passos sequenciais que os outros specs, e cada navegação real soma alguns segundos neste
  // ambiente de dev (filesystem lento, ver aviso "Slow filesystem detected" do Next).
  test.setTimeout(60_000);

  await loginAsAdmin(page);

  await page.goto("/admin/cuidadoras");
  await page.click('a[href="/admin/cuidadoras/nova"]');
  await page.waitForURL("**/admin/cuidadoras/nova");

  await page.fill('input[name="name"]', "E2E Nova Cuidadora");
  await page.fill('input[name="phone"]', "11977777777");
  await page.fill('input[name="email"]', NEW_CAREGIVER_EMAIL);
  await page.fill('input[name="tempPassword"]', NEW_CAREGIVER_PASSWORD);
  // Seletor específico de propósito: 'button[type="submit"]' também casa com o botão "Sair" do
  // header/sidebar do admin (mesmo tipo de botão, sempre presente no layout autenticado) — um
  // seletor genérico clica no primeiro em ordem de DOM, que é o "Sair" do header mobile, deslogando
  // em vez de submeter o formulário. Foi a causa real de uma investigação enorme numa sessão anterior
  // que erroneamente concluiu haver um bug de framework em prisma.create() dentro de Server Actions.
  await page.click('button:has-text("Salvar")');

  await expect(page.getByText("foi cadastrada com sucesso")).toBeVisible({ timeout: 10_000 });
  await page.click('a:has-text("Voltar para a lista")');
  await page.waitForURL("**/admin/cuidadoras");

  // O card mobile e a linha da tabela desktop ficam ambos no DOM (um escondido via CSS conforme o
  // breakpoint) — :visible restringe ao que realmente aparece na viewport de teste (390×844).
  const caregiverLink = page.locator('a:visible', { hasText: "E2E Nova Cuidadora" });
  await expect(caregiverLink).toBeVisible();

  // A cuidadora recém-criada consegue logar com a senha inicial definida pelo admin.
  await page.goto("/login");
  await page.fill('input[name="email"]', NEW_CAREGIVER_EMAIL);
  await page.fill('input[name="password"]', NEW_CAREGIVER_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/cuidadora", { timeout: 10_000 });

  // Admin desativa a cuidadora.
  await loginAsAdmin(page);
  await page.goto("/admin/cuidadoras");
  await page.locator('a:visible', { hasText: "E2E Nova Cuidadora" }).click();
  await page.waitForURL(/\/admin\/cuidadoras\/.+/);
  await page.click('button:has-text("Desativar cuidadora")');
  await expect(page.getByText("Inativa")).toBeVisible();

  // Cuidadora desativada não consegue mais logar.
  await page.goto("/login");
  await page.fill('input[name="email"]', NEW_CAREGIVER_EMAIL);
  await page.fill('input[name="password"]', NEW_CAREGIVER_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveURL(/\/login$/);
});
