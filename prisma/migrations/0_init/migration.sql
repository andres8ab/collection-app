-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BillEstado" AS ENUM ('PENDIENTE', 'LIQUIDADA');

-- CreateTable
CREATE TABLE "Ciudad" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ciudad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit" TEXT,
    "direccion" TEXT,
    "ciudadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendedor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "fv" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "devo" DECIMAL(14,2),
    "abono" DECIMAL(14,2),
    "reteFuente" DECIMAL(14,2),
    "iva" DECIMAL(14,2),
    "vSinIva" DECIMAL(14,2),
    "porcentajeComision" DECIMAL(5,4) NOT NULL DEFAULT 0.05,
    "vComi" DECIMAL(14,2),
    "flete" DECIMAL(14,2),
    "comentarios" TEXT,
    "estado" "BillEstado" NOT NULL DEFAULT 'PENDIENTE',
    "liquidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clienteId" TEXT NOT NULL,
    "ciudadId" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "settlementId" TEXT,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlySettlement" (
    "id" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlySettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ciudad_nombre_key" ON "Ciudad"("nombre");

-- CreateIndex
CREATE INDEX "Bill_vendedorId_estado_idx" ON "Bill"("vendedorId", "estado");

-- CreateIndex
CREATE INDEX "Bill_clienteId_fecha_idx" ON "Bill"("clienteId", "fecha");

-- CreateIndex
CREATE INDEX "Bill_settlementId_idx" ON "Bill"("settlementId");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_clienteId_fv_key" ON "Bill"("clienteId", "fv");

-- CreateIndex
CREATE INDEX "MonthlySettlement_vendedorId_idx" ON "MonthlySettlement"("vendedorId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySettlement_vendedorId_month_key" ON "MonthlySettlement"("vendedorId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_ciudadId_fkey" FOREIGN KEY ("ciudadId") REFERENCES "Ciudad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_ciudadId_fkey" FOREIGN KEY ("ciudadId") REFERENCES "Ciudad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Vendedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "MonthlySettlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlySettlement" ADD CONSTRAINT "MonthlySettlement_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Vendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
