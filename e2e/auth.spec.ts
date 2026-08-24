import { expect, test } from "@playwright/test";
import { E2E_ADMIN, E2E_CAREGIVER, E2E_GUARDIAN_A_USER, E2E_PASSWORD } from "./fixtures";

/**
 * Regressão do bug crítico encontrado na homologação: login com credenciais válidas caía de volta em
 * "/login" para qualquer papel (auth() lido logo após signIn() não via a sessão recém-gravada). Já coberto
 * por um teste unitário em src/app/login/actions.test.ts — este é o mesmo cenário, mas batendo num navegador
 * real contra o servidor de verdade, que foi como o bug foi originalmente encontrado.
 */

const ROLES = [
  { ...E2E_ADMIN, home: "/admin" },
  { ...E2E_CAREGIVER, home: "/cuidadora" },
  { ...E2E_GUARDIAN_A_USER, home: "/pais" },
];

for (const role of ROLES) {
  test(`login válido como ${role.email} redireciona para ${role.home}`, async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', role.email);
    await page.fill('input[name="password"]', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`**${role.home}`, { timeout: 10_000 });
    await expect(page).toHaveURL(new RegExp(`${role.home}$`));
  });
}

test("credenciais inválidas mostram mensagem amigável, sem sair do login", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', E2E_CAREGIVER.email);
  await page.fill('input[name="password"]', "senha-errada-de-proposito");
  await page.click('button[type="submit"]');

  await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveURL(/\/login$/);
});

test("acesso não autenticado a rota protegida redireciona para /login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

test("cuidadora não acessa área administrativa", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', E2E_CAREGIVER.email);
  await page.fill('input[name="password"]', E2E_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/cuidadora", { timeout: 10_000 });

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

test("cuidadora não acessa o Portal dos Pais", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', E2E_CAREGIVER.email);
  await page.fill('input[name="password"]', E2E_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/cuidadora", { timeout: 10_000 });

  await page.goto("/pais");
  await expect(page).toHaveURL(/\/login/);
});

test("responsável não acessa área administrativa nem área da cuidadora", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', E2E_GUARDIAN_A_USER.email);
  await page.fill('input[name="password"]', E2E_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/pais", { timeout: 10_000 });

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/cuidadora");
  await expect(page).toHaveURL(/\/login/);
});
