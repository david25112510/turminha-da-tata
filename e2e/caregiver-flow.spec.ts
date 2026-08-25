import { expect, type Page, test } from "@playwright/test";
import { E2E_CAREGIVER, E2E_CHILD_A, E2E_GUARDIAN_A, E2E_PASSWORD } from "./fixtures";

async function loginAsCaregiver(page: Page) {
  await page.goto("/login");
  await page.fill('input[name="email"]', E2E_CAREGIVER.email);
  await page.fill('input[name="password"]', E2E_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/cuidadora", { timeout: 10_000 });
}

/**
 * Fluxo real de um dia de trabalho da cuidadora, num único teste sequencial (mobile, 390×844) — a mesma
 * jornada validada manualmente na homologação: login → dashboard → registrar chegada → abrir a criança →
 * registrar alimentação/humor/sono → conferir a timeline atualizada.
 */
test("cuidadora registra a rotina de uma criança do início ao fim", async ({ page }) => {
  // Timeout maior que o padrão (30s): login + 5 registros sequenciais (chegada, alimentação, humor,
  // soneca, conferência da timeline) — mesmo motivo já documentado em admin-caregivers.spec.ts e
  // guardian-flow.spec.ts para fluxos multi-passo neste ambiente de dev (filesystem lento).
  test.setTimeout(60_000);

  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  await loginAsCaregiver(page);
  // Escopado por data-testid (não por nome) — um banco real pode ter mais de uma criança com o mesmo
  // primeiro nome, então o teste não pode depender de ser o único "Maria" na tela.
  const childCard = page.getByTestId(`child-card-${E2E_CHILD_A.id}`);
  await expect(childCard).toBeVisible();
  await expect(childCard.getByText("Aguardando chegada")).toBeVisible();

  // Registrar chegada
  await childCard.getByRole("button", { name: "Registrar chegada" }).click();
  const checkInDialog = page.locator("dialog[open]");
  await expect(checkInDialog).toBeVisible();
  await expect(checkInDialog.getByText(E2E_GUARDIAN_A.name)).toBeVisible();
  await checkInDialog.getByRole("button", { name: new RegExp(E2E_GUARDIAN_A.name) }).click();
  await expect(childCard.getByText("Presente")).toBeVisible({ timeout: 10_000 });

  // Abrir o perfil da criança
  await childCard.getByRole("link", { name: E2E_CHILD_A.preferredName }).click();
  await page.waitForURL(`**/cuidadora/criancas/${E2E_CHILD_A.id}`);
  await expect(page.getByRole("heading", { name: E2E_CHILD_A.preferredName })).toBeVisible();
  await expect(page.getByText(new RegExp(`trazida por ${E2E_GUARDIAN_A.name}`))).toBeVisible();

  // Registrar alimentação
  await page.click('button:has-text("Alimentação")');
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.locator('dialog[open] button[type="submit"]').click();
  await expect(page.getByText("✓ Alimentação registrada")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("dialog[open]")).toBeHidden({ timeout: 5_000 });

  // Registrar humor (um toque = salvo)
  await page.click('button:has-text("Humor")');
  await page.locator('dialog[open] button:has-text("Bem")').first().click();
  await expect(page.locator("dialog[open]")).toBeHidden({ timeout: 5_000 });

  // Iniciar soneca
  await page.click('button:has-text("Iniciar soneca")');
  await expect(page.getByText("Finalizar soneca")).toBeVisible({ timeout: 10_000 });

  // Timeline reflete tudo na ordem certa
  const timeline = page.getByText("Rotina de hoje").locator("..");
  await expect(timeline.getByText("Chegada")).toBeVisible();
  await expect(timeline.getByText(/Lanche|Café|Almoço|Jantar/)).toBeVisible();
  await expect(timeline.getByText("Humor")).toBeVisible();
  await expect(timeline.getByText("Soneca")).toBeVisible();

  expect(consoleErrors, `console/page errors: ${JSON.stringify(consoleErrors)}`).toEqual([]);
});
