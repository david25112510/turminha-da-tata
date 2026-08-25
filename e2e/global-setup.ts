import bcrypt from "bcryptjs";
import { prisma } from "./prisma-client";
import { cleanupE2EData } from "./cleanup";
import {
  E2E_ADMIN,
  E2E_CAREGIVER,
  E2E_CHILD_A,
  E2E_CHILD_B,
  E2E_CONTRACT_ACCEPTANCE_A,
  E2E_CONTRACT_ACCEPTANCE_B,
  E2E_GUARDIAN_A,
  E2E_GUARDIAN_A_USER,
  E2E_GUARDIAN_B,
  E2E_GUARDIAN_B_USER,
  E2E_PASSWORD,
} from "./fixtures";

export default async function globalSetup() {
  // Limpa sobras de uma execução anterior interrompida antes de recriar do zero.
  await cleanupE2EData();

  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 10);

  await prisma.user.create({ data: { ...E2E_ADMIN, passwordHash, role: "ADMIN" } });
  await prisma.user.create({ data: { ...E2E_CAREGIVER, passwordHash, role: "CAREGIVER" } });
  const guardianUserA = await prisma.user.create({ data: { ...E2E_GUARDIAN_A_USER, passwordHash, role: "GUARDIAN" } });
  const guardianUserB = await prisma.user.create({ data: { ...E2E_GUARDIAN_B_USER, passwordHash, role: "GUARDIAN" } });

  const guardianA = await prisma.guardian.create({
    data: { id: E2E_GUARDIAN_A.id, userId: guardianUserA.id, name: E2E_GUARDIAN_A.name, cpf: "00000000001", phone: "11900000001" },
  });
  const guardianB = await prisma.guardian.create({
    data: { id: E2E_GUARDIAN_B.id, userId: guardianUserB.id, name: E2E_GUARDIAN_B.name, cpf: "00000000002", phone: "11900000002" },
  });

  const childCommon = {
    birthDate: new Date(2022, 0, 1),
    contractedEntryTime: "07:30",
    contractedExitTime: "17:30",
    contractedDays: ["MON", "TUE", "WED", "THU", "FRI"],
    toleranceMinutes: 15,
    monthlyFee: 900,
    overtimeHourRate: 15,
    dueDay: 5,
    imageAuthorized: false,
  };

  const childA = await prisma.child.create({
    data: { ...E2E_CHILD_A, sex: "FEMALE", ...childCommon },
  });
  const childB = await prisma.child.create({
    data: { ...E2E_CHILD_B, sex: "MALE", ...childCommon },
  });

  await prisma.guardianChild.create({
    data: {
      guardianId: guardianA.id,
      childId: childA.id,
      relationship: "MOTHER",
      isPrimary: true,
      isFinancialResponsible: true,
      viewRoutine: true,
      viewPhotos: true,
      viewFinancial: true,
      authorizePickup: true,
    },
  });
  await prisma.guardianChild.create({
    data: {
      guardianId: guardianB.id,
      childId: childB.id,
      relationship: "FATHER",
      isPrimary: true,
      isFinancialResponsible: true,
      viewRoutine: true,
      viewPhotos: true,
      viewFinancial: true,
      authorizePickup: true,
    },
  });

  // Contrato já aceito para os dois guardians fixos — sem isso, todo o resto da suíte (que não testa o
  // fluxo de contrato) cairia no bloqueio de /pais/contrato ao logar como responsável. Quem quer testar o
  // fluxo de contrato em si usa a UI real (e2e/contract.spec.ts), não este atalho.
  const admin = await prisma.user.findUniqueOrThrow({ where: { id: E2E_ADMIN.id } });
  const contractVersion = await prisma.contractVersion.create({
    data: { version: "1.0", content: "Contrato de teste e2e.", status: "PUBLISHED", createdById: admin.id, publishedAt: new Date() },
  });
  await prisma.contractAcceptance.createMany({
    data: [
      { id: E2E_CONTRACT_ACCEPTANCE_A, childId: childA.id, guardianId: guardianA.id, versionId: contractVersion.id, status: "ACCEPTED", acceptedAt: new Date(), acceptedByUserId: guardianUserA.id },
      { id: E2E_CONTRACT_ACCEPTANCE_B, childId: childB.id, guardianId: guardianB.id, versionId: contractVersion.id, status: "ACCEPTED", acceptedAt: new Date(), acceptedByUserId: guardianUserB.id },
    ],
  });

  await prisma.$disconnect();
}
