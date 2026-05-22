-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InvoiceStatus" ADD VALUE 'GENERADA_XML';
ALTER TYPE "InvoiceStatus" ADD VALUE 'FIRMADA';
ALTER TYPE "InvoiceStatus" ADD VALUE 'ENVIADA_SRI';
ALTER TYPE "InvoiceStatus" ADD VALUE 'RECIBIDA';
ALTER TYPE "InvoiceStatus" ADD VALUE 'DEVUELTA';
ALTER TYPE "InvoiceStatus" ADD VALUE 'NO_AUTORIZADA';
ALTER TYPE "InvoiceStatus" ADD VALUE 'ERROR_CONEXION';

-- CreateTable
CREATE TABLE "SriJob" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SriJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SriJob_status_nextRunAt_idx" ON "SriJob"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "SriJob_invoiceId_idx" ON "SriJob"("invoiceId");

-- AddForeignKey
ALTER TABLE "SriJob" ADD CONSTRAINT "SriJob_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
