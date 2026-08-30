import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const MIN_BOOTSTRAP_PASSWORD_LENGTH = 15;
const BLOCKED_BOOTSTRAP_PASSWORDS = new Set([
  "TrocarSenha123!",
  "Admin123456789!",
  "Password123456!",
]);

function getBootstrapAdminConfig() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Administradora";
  const isProduction = process.env.NODE_ENV === "production";

  if (!email || !password) {
    if (isProduction) {
      throw new Error(
        "Bootstrap do administrador não configurado. Defina ADMIN_EMAIL e ADMIN_INITIAL_PASSWORD antes de executar o seed em produção."
      );
    }
    return null;
  }

  if (!email.includes("@")) throw new Error("ADMIN_EMAIL inválido.");
  if (password.length < MIN_BOOTSTRAP_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_INITIAL_PASSWORD deve ter pelo menos ${MIN_BOOTSTRAP_PASSWORD_LENGTH} caracteres.`);
  }
  if (BLOCKED_BOOTSTRAP_PASSWORDS.has(password)) {
    throw new Error("ADMIN_INITIAL_PASSWORD usa uma credencial previsível/bloqueada.");
  }

  return { email, password, name };
}

async function main() {
  const config = getBootstrapAdminConfig();
  if (!config) {
    console.warn(
      "Seed sem bootstrap de administrador: defina ADMIN_EMAIL e ADMIN_INITIAL_PASSWORD no ambiente quando precisar criar a primeira conta."
    );
    return;
  }

  // Idempotência de segurança: um seed posterior nunca redefine senha, MFA, role ou status de uma
  // conta já existente. Alterações em usuários devem ocorrer pelos fluxos administrativos auditados.
  const existing = await prisma.user.findUnique({ where: { email: config.email }, select: { id: true, email: true } });
  if (existing) {
    console.log("Usuário administrador já existe; nenhuma credencial foi alterada:", existing.email);
    return;
  }

  const passwordHash = await bcrypt.hash(config.password, 12);
  const admin = await prisma.user.create({
    data: {
      email: config.email,
      passwordHash,
      name: config.name,
      role: "ADMIN",
    },
    select: { email: true },
  });

  // Nunca registrar a senha inicial em logs de aplicação, CI ou deploy.
  console.log("Usuário administrador criado:", admin.email);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : "Falha ao executar seed.");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
