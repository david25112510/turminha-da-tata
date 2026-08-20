import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const email = "admin@turminhadatata.com.br";
  const passwordHash = await bcrypt.hash("TrocarSenha123!", 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      name: "Administradora",
      role: "ADMIN",
    },
  });

  console.log("Usuário administrador pronto:", admin.email);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
