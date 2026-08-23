import { expect, test } from "@playwright/test";
import { E2E_CHILD_A, E2E_CHILD_B, E2E_GUARDIAN_A_USER, E2E_PASSWORD } from "./fixtures";

/**
 * Um dos testes mais importantes do sistema: um responsável nunca deve ver dados de uma criança que não é
 * sua, mesmo manipulando a URL diretamente. Guardian A está vinculado só à Criança A (ver global-setup.ts);
 * aqui ele tenta acessar a Criança B (de outra família) trocando o childId na URL manualmente.
 */
test.describe("isolamento de dados entre famílias", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', E2E_GUARDIAN_A_USER.email);
    await page.fill('input[name="password"]', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/pais", { timeout: 10_000 });
  });

  test("responsável não vê a jornada de uma criança de outra família via URL", async ({ page }) => {
    await page.goto(`/pais/jornada?childId=${E2E_CHILD_B.id}`);
    const body = await page.locator("body").innerText();
    expect(body).not.toContain(E2E_CHILD_B.preferredName);
  });

  test("responsável não vê fotos de uma criança de outra família via URL", async ({ page }) => {
    await page.goto(`/pais/fotos?childId=${E2E_CHILD_B.id}`);
    const body = await page.locator("body").innerText();
    expect(body).not.toContain(E2E_CHILD_B.preferredName);
  });

  test("responsável não vê financeiro de uma criança de outra família via URL", async ({ page }) => {
    await page.goto(`/pais/financeiro?childId=${E2E_CHILD_B.id}`);
    const body = await page.locator("body").innerText();
    expect(body).not.toContain(E2E_CHILD_B.preferredName);
  });

  test("responsável continua vendo a própria criança normalmente", async ({ page }) => {
    await page.goto("/pais/jornada");
    await expect(page.getByRole("heading", { name: new RegExp(E2E_CHILD_A.preferredName) })).toBeVisible();
  });
});
