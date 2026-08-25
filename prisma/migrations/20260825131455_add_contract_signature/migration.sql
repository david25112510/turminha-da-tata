-- AlterTable
ALTER TABLE "contract_acceptances" ADD COLUMN     "documentHash" TEXT,
ADD COLUMN     "signatureUrl" TEXT,
ADD COLUMN     "signedAt" TIMESTAMP(3);
