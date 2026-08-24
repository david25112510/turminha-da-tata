import { expect, test } from "@playwright/test";
import { E2E_ADMIN, E2E_PASSWORD } from "./fixtures";

/**
 * Troca de senha autenticada (seções 9, 12, 13 do spec) — coberta uma vez aqui pelo perfil do admin
 * (a mesma ChangePasswordForm/changePasswordAction é reaproveitada em /cuidadora/perfil e /pais/perfil,
 * já cobertos por unit test em src/lib/account-actions.test.ts).
 */
test("admin troca a própria senha e consegue logar com a nova senha", async ({ page }) => {
  const newPassword = "NovaSenhaAdmin123!";

  await page.goto("/login");
  await page.fill('input[name="email"]', E2E_ADMIN.email);
  await page.fill('input[name="password"]', E2E_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 10_000 });

  await page.goto("/admin/configuracoes");
  await page.fill('input[name="currentPassword"]', E2E_PASSWORD);
  await page.fill('input[name="newPassword"]', newPassword);
  await page.fill('input[name="confirmPassword"]', newPassword);
  await page.click('button:has-text("Alterar senha")');
  await expect(page.getByText("Senha alterada com sucesso.")).toBeVisible({ timeout: 10_000 });

  await page.goto("/login");
  await page.fill('input[name="email"]', E2E_ADMIN.email);
  await page.fill('input[name="password"]', newPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 10_000 });

  // Restaura a senha original — outros testes do arquivo global de fixtures dependem de E2E_PASSWORD.
  await page.goto("/admin/configuracoes");
  await page.fill('input[name="currentPassword"]', newPassword);
  await page.fill('input[name="newPassword"]', E2E_PASSWORD);
  await page.fill('input[name="confirmPassword"]', E2E_PASSWORD);
  await page.click('button:has-text("Alterar senha")');
  await expect(page.getByText("Senha alterada com sucesso.")).toBeVisible({ timeout: 10_000 });
});
