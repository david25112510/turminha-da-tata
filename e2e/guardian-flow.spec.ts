import { expect, test } from "@playwright/test";
import { E2E_CAREGIVER, E2E_CHILD_B, E2E_GUARDIAN_B, E2E_GUARDIAN_B_USER, E2E_PASSWORD } from "./fixtures";

/**
 * Fluxo ponta a ponta entre os dois portais (seção 59 do pedido do Portal dos Pais): a cuidadora registra
 * eventos reais e o responsável precisa ver exatamente esses eventos refletidos — sem fonte de dados
 * paralela. Duas sessões de navegador simultâneas (cuidadora e responsável), cada uma na sua própria
 * BrowserContext. Usa a Criança B (João) — a Criança A já é mexida por caregiver-flow.spec.ts, e checar
 * entrada duas vezes no mesmo dia é bloqueado pela própria regra de negócio.
 */
test("cuidadora registra a rotina e o responsável vê refletido no portal dos pais", async ({ browser }) => {
  const caregiverContext = await browser.newContext();
  const guardianContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const caregiverPage = await caregiverContext.newPage();
  const guardianPage = await guardianContext.newPage();

  // Cuidadora: login → check-in → alimentação
  await caregiverPage.goto("/login");
  await caregiverPage.fill('input[name="email"]', E2E_CAREGIVER.email);
  await caregiverPage.fill('input[name="password"]', E2E_PASSWORD);
  await caregiverPage.click('button[type="submit"]');
  await caregiverPage.waitForURL("**/cuidadora", { timeout: 10_000 });

  const childCard = caregiverPage.getByTestId(`child-card-${E2E_CHILD_B.id}`);
  await childCard.getByRole("button", { name: "Registrar chegada" }).click();
  await caregiverPage.locator("dialog[open]").getByRole("button", { name: new RegExp(E2E_GUARDIAN_B.name) }).click();
  await expect(childCard.getByText("Presente")).toBeVisible({ timeout: 10_000 });

  await childCard.getByRole("link", { name: E2E_CHILD_B.preferredName }).click();
  await caregiverPage.waitForURL(`**/cuidadora/criancas/${E2E_CHILD_B.id}`);
  await caregiverPage.click('button:has-text("Alimentação")');
  await caregiverPage.locator('dialog[open] button[type="submit"]').click();
  await expect(caregiverPage.getByText("✓ Alimentação registrada")).toBeVisible({ timeout: 10_000 });

  // Responsável: login → dashboard mostra chegada → jornada mostra os dois eventos
  await guardianPage.goto("/login");
  await guardianPage.fill('input[name="email"]', E2E_GUARDIAN_B_USER.email);
  await guardianPage.fill('input[name="password"]', E2E_PASSWORD);
  await guardianPage.click('button[type="submit"]');
  await guardianPage.waitForURL("**/pais", { timeout: 10_000 });

  await expect(guardianPage.getByText("Na Turminha da Tata")).toBeVisible({ timeout: 10_000 });
  await expect(guardianPage.getByText(new RegExp(`quem trouxe.*${E2E_GUARDIAN_B.name}`, "i"))).toBeVisible();

  await guardianPage.goto("/pais/jornada");
  const timeline = guardianPage.getByText("Rotina de hoje").locator("..");
  await expect(timeline.getByText("Chegada")).toBeVisible();
  await expect(timeline.getByText(/Lanche|Café|Almoço|Jantar/)).toBeVisible();

  await caregiverContext.close();
  await guardianContext.close();
});
