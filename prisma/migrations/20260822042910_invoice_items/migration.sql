-- CreateEnum
CREATE TYPE "InvoiceItemType" AS ENUM ('MONTHLY_FEE', 'OVERTIME', 'DISCOUNT', 'CREDIT', 'DEBIT', 'ADJUSTMENT', 'OTHER');

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "type" "InvoiceItemType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2),
    "unitPrice" DECIMAL(10,2),
    "amount" DECIMAL(10,2) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "monthly_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
