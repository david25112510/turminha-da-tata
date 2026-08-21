import "dotenv/config";
import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
const backupFile = process.argv[2];

if (!databaseUrl) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}
if (!backupFile) {
  console.error("Uso: node scripts/restore-db.mjs <arquivo-de-backup.dump>");
  process.exit(1);
}

const pgRestoreBin = process.env.PG_RESTORE_BIN || "pg_restore";

console.log(`Restaurando ${backupFile} em ${databaseUrl.replace(/:[^:@]*@/, ":***@")}...`);

const result = spawnSync(
  pgRestoreBin,
  ["--clean", "--if-exists", "--no-owner", "--dbname", databaseUrl, backupFile],
  { stdio: "inherit" }
);

if (result.status !== 0) {
  console.error("Falha ao restaurar backup.");
  process.exit(result.status ?? 1);
}

console.log("Restauração concluída.");
