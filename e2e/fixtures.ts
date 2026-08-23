/**
 * Dados fixos usados pelos testes E2E — criados por global-setup.ts antes da suíte rodar e removidos por
 * global-teardown.ts depois. IDs prefixados "e2e-" para nunca colidir com dados reais e para o teardown
 * conseguir encontrar (e apagar) exatamente o que foi criado, nada mais.
 */
export const E2E_PASSWORD = "E2eSenha123!";

export const E2E_ADMIN = { id: "e2e-user-admin", email: "e2e-admin@turminhadatata.com.br", name: "E2E Admin" };
export const E2E_CAREGIVER = { id: "e2e-user-caregiver", email: "e2e-caregiver@turminhadatata.com.br", name: "E2E Cuidadora" };
export const E2E_GUARDIAN_A_USER = { id: "e2e-user-guardian-a", email: "e2e-guardian-a@turminhadatata.com.br", name: "E2E Responsável A" };
export const E2E_GUARDIAN_B_USER = { id: "e2e-user-guardian-b", email: "e2e-guardian-b@turminhadatata.com.br", name: "E2E Responsável B" };

export const E2E_GUARDIAN_A = { id: "e2e-guardian-a", name: "E2E Mãe da Maria" };
export const E2E_GUARDIAN_B = { id: "e2e-guardian-b", name: "E2E Pai do João" };

export const E2E_CHILD_A = { id: "e2e-child-maria", fullName: "E2E Maria Teste", preferredName: "Maria" };
export const E2E_CHILD_B = { id: "e2e-child-joao", fullName: "E2E João Teste", preferredName: "João" };

export const ALL_E2E_USER_IDS = [E2E_ADMIN.id, E2E_CAREGIVER.id, E2E_GUARDIAN_A_USER.id, E2E_GUARDIAN_B_USER.id];
export const ALL_E2E_GUARDIAN_IDS = [E2E_GUARDIAN_A.id, E2E_GUARDIAN_B.id];
export const ALL_E2E_CHILD_IDS = [E2E_CHILD_A.id, E2E_CHILD_B.id];
