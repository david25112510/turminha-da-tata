import { expect, test } from "@playwright/test";
import { E2E_CAREGIVER, E2E_CHILD_B, E2E_GUARDIAN_A_USER, E2E_PASSWORD } from "../fixtures";
import { prisma } from "../prisma-client";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', E2E_PASSWORD);
  await page.click('button[type="submit"]');
}

test("SEC-003: conta desativada perde a sessão na próxima navegação", async ({ page }) => {
  await login(page, E2E_CAREGIVER.email);
  await page.waitForURL("**/cuidadora", { timeout: 10_000 });

  await prisma.user.update({ where: { id: E2E_CAREGIVER.id }, data: { active: false } });
  try {
    await page.goto("/cuidadora");
    await expect(page).toHaveURL(/\/login/);
  } finally {
    await prisma.user.update({ where: { id: E2E_CAREGIVER.id }, data: { active: true } });
  }
});

test("SEC-004: storage de outra família é negado no servidor", async ({ page }) => {
  await login(page, E2E_GUARDIAN_A_USER.email);
  await page.waitForURL("**/pais", { timeout: 10_000 });

  const response = await page.request.get(`/api/storage/children/${E2E_CHILD_B.id}/foto.webp`);
  expect(response.status()).toBe(403);
  expect(response.headers()["cache-control"] ?? "").not.toContain("public");
});

test("SEC-036: páginas públicas entregam os headers obrigatórios", async ({ request }) => {
  const response = await request.get("/login");
  const headers = response.headers();

  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
});
