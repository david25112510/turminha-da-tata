import "dotenv/config";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

const backupDir = process.env.BACKUP_DIR || path.resolve(process.cwd(), "backups");
mkdirSync(backupDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outFile = path.join(backupDir, `turminha-da-tata-${timestamp}.dump`);

const pgDumpBin = process.env.PG_DUMP_BIN || "pg_dump";

const result = spawnSync(pgDumpBin, ["--format=custom", "--file", outFile, databaseUrl], {
  stdio: "inherit",
});

if (result.status !== 0) {
  console.error("Falha ao gerar backup.");
  process.exit(result.status ?? 1);
}

console.log("Backup criado em:", outFile);
