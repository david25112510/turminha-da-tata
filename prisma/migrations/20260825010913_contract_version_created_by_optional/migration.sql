-- DropForeignKey
ALTER TABLE "contract_versions" DROP CONSTRAINT "contract_versions_createdById_fkey";

-- AlterTable
ALTER TABLE "contract_versions" ALTER COLUMN "createdById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
