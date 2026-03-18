-- AlterTable
ALTER TABLE "Cliente" ALTER COLUMN "nit" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_nit_key" ON "Cliente"("nit");

