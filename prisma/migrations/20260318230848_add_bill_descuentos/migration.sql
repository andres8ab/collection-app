-- CreateTable
CREATE TABLE "BillDescuento" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "concepto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillDescuento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillDescuento_billId_idx" ON "BillDescuento"("billId");

-- AddForeignKey
ALTER TABLE "BillDescuento" ADD CONSTRAINT "BillDescuento_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
