import { createServerFn } from '@tanstack/react-start'
import { db } from './db'
import type { BillEstado } from '@prisma/client'

const toNum = (v: number | string | null | undefined): number | null =>
  v == null ? null : Number(v)

// --- Ciudades
export const listCiudades = createServerFn({ method: 'GET' })
  .inputValidator((q: string | undefined) => q)
  .handler(async (ctx) => {
    const search = ctx.data
    const ciudades = await db.ciudad.findMany({
      where: search
        ? { nombre: { contains: search, mode: 'insensitive' } }
        : undefined,
      orderBy: { nombre: 'asc' },
    })
    return ciudades
  })

export const createCiudad = createServerFn({ method: 'POST' })
  .inputValidator((data: { nombre: string }) => data)
  .handler(async (ctx) => {
    const data = ctx.data
    return db.ciudad.create({
      data: { nombre: data.nombre.trim() },
    })
  })

// --- Clientes
export const listClientes = createServerFn({ method: 'GET' })
  .inputValidator((q: string | undefined) => q)
  .handler(async (ctx) => {
    const search = ctx.data
    const clientes = await db.cliente.findMany({
      where: search
        ? {
            OR: [
              { nombre: { contains: search, mode: 'insensitive' } },
              { nit: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: { ciudad: true },
      orderBy: { nombre: 'asc' },
    })
    return clientes
  })

export const createCliente = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { nombre: string; nit?: string; direccion?: string; ciudadId: string }) =>
      data
  )
  .handler(async (ctx) => {
    const data = ctx.data
    return db.cliente.create({
      data: {
        nombre: data.nombre.trim(),
        nit: data.nit?.trim() || null,
        direccion: data.direccion?.trim() || null,
        ciudadId: data.ciudadId,
      },
      include: { ciudad: true },
    })
  })

export const updateCliente = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: string
      nombre?: string
      nit?: string
      direccion?: string
      ciudadId?: string
    }) => data
  )
  .handler(async (ctx) => {
    const { id, ...rest } = ctx.data
    return db.cliente.update({
      where: { id },
      data: rest,
      include: { ciudad: true },
    })
  })

// --- Vendedores
export const listVendedores = createServerFn({ method: 'GET' })
  .inputValidator((q: string | undefined) => q)
  .handler(async (ctx) => {
    const search = ctx.data
    const vendedores = await db.vendedor.findMany({
      where: search
        ? { nombre: { contains: search, mode: 'insensitive' } }
        : undefined,
      orderBy: { nombre: 'asc' },
    })
    return vendedores
  })

export const createVendedor = createServerFn({ method: 'POST' })
  .inputValidator((data: { nombre: string }) => data)
  .handler(async (ctx) => {
    const data = ctx.data
    return db.vendedor.create({
      data: { nombre: data.nombre.trim() },
    })
  })

// --- Bills (facturas) — compute derived amounts (stored as numbers; Prisma accepts them for Decimal)
function computeBillFields(
  valor: number,
  devo: number | null,
  abono: number | null,
  iva: number | null,
  pct: number
) {
  const d = devo ?? 0
  const a = abono ?? 0
  const i = iva ?? 0
  const vSinIva = valor - i
  const vComi = vSinIva * pct
  return { vSinIva, vComi }
}

export const listBills = createServerFn({ method: 'GET' })
  .inputValidator((opts: { vendedorId?: string; clienteId?: string; estado?: BillEstado } | undefined) => opts)
  .handler(async (ctx) => {
    const opts = ctx.data
    const bills = await db.bill.findMany({
      where: {
        ...(opts?.vendedorId && { vendedorId: opts.vendedorId }),
        ...(opts?.clienteId && { clienteId: opts.clienteId }),
        ...(opts?.estado && { estado: opts.estado }),
      },
      include: {
        cliente: true,
        ciudad: true,
        vendedor: true,
        settlement: true,
        payments: true,
      },
      orderBy: [{ fecha: 'desc' }, { fv: 'desc' }],
    })
    return bills
  })

export const createBill = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      clienteId: string
      fv: number
      ciudadId: string
      vendedorId: string
      valor: number
      fecha?: string
      devo?: number | null
      abono?: number | null
      reteFuente?: number | null
      iva?: number | null
      porcentajeComision?: number
      flete?: number | null
      comentarios?: string | null
    }) => data
  )
  .handler(async (ctx) => {
    const data = ctx.data
    const valor = Number(data.valor)
    const devo = toNum(data.devo)
    const abono = toNum(data.abono)
    const iva = toNum(data.iva)
    const pct = data.porcentajeComision ?? 0.05
    const { vSinIva, vComi } = computeBillFields(valor, devo, abono, iva, pct)
    const fecha = data.fecha ? new Date(data.fecha) : new Date()
    return db.bill.create({
      data: {
        clienteId: data.clienteId,
        ciudadId: data.ciudadId,
        vendedorId: data.vendedorId,
        fv: data.fv,
        fecha,
        valor,
        devo,
        abono,
        reteFuente: toNum(data.reteFuente),
        iva,
        vSinIva,
        vComi,
        porcentajeComision: pct,
        flete: toNum(data.flete),
        comentarios: data.comentarios?.trim() || null,
      },
      include: { cliente: true, ciudad: true, vendedor: true },
    })
  })

export const updateBill = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: string
      devo?: number | null
      abono?: number | null
      reteFuente?: number | null
      iva?: number | null
      flete?: number | null
      comentarios?: string | null
    }) => data
  )
  .handler(async (ctx) => {
    const { id, ...rest } = ctx.data
    const existing = await db.bill.findUniqueOrThrow({ where: { id } })
    const valor = Number(existing.valor)
    const devo = rest.devo !== undefined ? toNum(rest.devo) : Number(existing.devo ?? 0)
    const abono = rest.abono !== undefined ? toNum(rest.abono) : Number(existing.abono ?? 0)
    const iva = rest.iva !== undefined ? toNum(rest.iva) : Number(existing.iva ?? 0)
    const pct = Number(existing.porcentajeComision)
    const { vSinIva, vComi } = computeBillFields(valor, devo, abono, iva, pct)
    return db.bill.update({
      where: { id },
      data: {
        ...(rest.devo !== undefined && { devo: rest.devo }),
        ...(rest.abono !== undefined && { abono: rest.abono }),
        ...(rest.reteFuente !== undefined && { reteFuente: toNum(rest.reteFuente) }),
        ...(rest.iva !== undefined && { iva: rest.iva }),
        ...(rest.flete !== undefined && { flete: rest.flete }),
        ...(rest.comentarios !== undefined && { comentarios: rest.comentarios?.trim() || null }),
        vSinIva,
        vComi,
      },
      include: { cliente: true, ciudad: true, vendedor: true },
    })
  })

// --- Bill payments (multi-abonos)
async function recomputeBillAbono(billId: string) {
  const bill = await db.bill.findUniqueOrThrow({
    where: { id: billId },
    include: { payments: true },
  })

  const totalAbono = bill.payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const valor = Number(bill.valor)
  const devo = Number(bill.devo ?? 0)
  const iva = Number(bill.iva ?? 0)
  const pct = Number(bill.porcentajeComision)
  const { vSinIva, vComi } = computeBillFields(valor, devo, totalAbono, iva, pct)

  return db.bill.update({
    where: { id: billId },
    data: {
      abono: totalAbono || null,
      vSinIva,
      vComi,
    },
    include: { cliente: true, ciudad: true, vendedor: true, payments: true },
  })
}

export const listBillPayments = createServerFn({ method: 'GET' })
  .inputValidator((billId: string) => billId)
  .handler(async (ctx) => {
    const billId = ctx.data
    const payments = await db.billPayment.findMany({
      where: { billId },
      orderBy: { paidAt: 'asc' },
    })
    const total = payments.reduce((s, p) => s + Number(p.amount), 0)
    return { payments, total }
  })

export const addBillPayment = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { billId: string; amount: number; paidAt: string }) => data,
  )
  .handler(async (ctx) => {
    const { billId, amount, paidAt } = ctx.data
    const cleanAmount = Number(amount)
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      throw new Error('Monto inválido')
    }
    const paidDate = new Date(paidAt)
    await db.billPayment.create({
      data: {
        billId,
        amount: cleanAmount,
        paidAt: paidDate,
      },
    })
    const updatedBill = await recomputeBillAbono(billId)
    return updatedBill
  })

export const deleteBillPayment = createServerFn({ method: 'POST' })
  .inputValidator((data: { paymentId: string }) => data)
  .handler(async (ctx) => {
    const { paymentId } = ctx.data
    const existing = await db.billPayment.findUniqueOrThrow({
      where: { id: paymentId },
    })
    await db.billPayment.delete({ where: { id: paymentId } })
    const updatedBill = await recomputeBillAbono(existing.billId)
    return updatedBill
  })

// --- Liquidar / Settlements
export const liquidarFactura = createServerFn({ method: 'POST' })
  .inputValidator((billId: string) => billId)
  .handler(async (ctx) => {
    const billId = ctx.data
    const bill = await db.bill.findUniqueOrThrow({
      where: { id: billId },
      include: { vendedor: true },
    })
    if (bill.estado === 'LIQUIDADA') {
      return { ok: false, message: 'Factura ya está liquidada' }
    }
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    let settlement = await db.monthlySettlement.findUnique({
      where: { vendedorId_month: { vendedorId: bill.vendedorId, month: monthKey } },
    })
    if (!settlement) {
      settlement = await db.monthlySettlement.create({
        data: { vendedorId: bill.vendedorId, month: monthKey },
      })
    }
    await db.bill.update({
      where: { id: billId },
      data: { estado: 'LIQUIDADA', liquidatedAt: now, settlementId: settlement.id },
    })
    return { ok: true, settlementId: settlement.id }
  })

export const removeBillFromSettlement = createServerFn({ method: 'POST' })
  .inputValidator((billId: string) => billId)
  .handler(async (ctx) => {
    const billId = ctx.data
    await db.bill.update({
      where: { id: billId },
      data: { estado: 'PENDIENTE', liquidatedAt: null, settlementId: null },
    })
    return { ok: true }
  })

// --- Monthly settlements (list by vendedor, get one month)
export const listSettlementsByVendedor = createServerFn({ method: 'GET' })
  .inputValidator((vendedorId: string) => vendedorId)
  .handler(async (ctx) => {
    const vendedorId = ctx.data
    return db.monthlySettlement.findMany({
      where: { vendedorId },
      include: {
        vendedor: true,
        bills: {
          include: { cliente: true, ciudad: true },
        },
      },
      orderBy: { month: 'desc' },
    })
  })

export const getSettlement = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async (ctx) => {
    const id = ctx.data
    return db.monthlySettlement.findUniqueOrThrow({
      where: { id },
      include: {
        vendedor: true,
        bills: {
          include: { cliente: true, ciudad: true },
        },
      },
    })
  })

// --- Report: account statement (cliente + date range)
export const getAccountStatement = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { clienteId: string; desde: string; hasta: string }) => data
  )
  .handler(async (ctx) => {
    const data = ctx.data
    const desde = new Date(data.desde)
    const hasta = new Date(data.hasta)
    const bills = await db.bill.findMany({
      where: {
        clienteId: data.clienteId,
        fecha: { gte: desde, lte: hasta },
      },
      include: { ciudad: true, vendedor: true },
      orderBy: [{ fecha: 'asc' }, { fv: 'asc' }],
    })
    const cliente = await db.cliente.findUniqueOrThrow({
      where: { id: data.clienteId },
      include: { ciudad: true },
    })
    return { cliente, bills }
  })
