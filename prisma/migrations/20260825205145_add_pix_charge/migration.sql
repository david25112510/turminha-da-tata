-- CreateTable
CREATE TABLE "pix_charges" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "externalPaymentId" TEXT NOT NULL,
    "initiatedByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amount" DECIMAL(10,2) NOT NULL,
    "qrCode" TEXT NOT NULL,
    "qrCodeText" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pix_charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pix_charges_externalPaymentId_key" ON "pix_charges"("externalPaymentId");

-- CreateIndex
CREATE INDEX "pix_charges_invoiceId_idx" ON "pix_charges"("invoiceId");

-- AddForeignKey
ALTER TABLE "pix_charges" ADD CONSTRAINT "pix_charges_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "monthly_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
