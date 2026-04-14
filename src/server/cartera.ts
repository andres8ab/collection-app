import { createServerFn } from '@tanstack/react-start'
import { db } from './db'
import type { BillEstado } from '@prisma/client'

const toNum = (v: number | string | null | undefined): number | null =>
  v == null ? null : Number(v)

/** Convert Prisma Decimal (or number) to number for serialization over the wire (Seroval cannot serialize Decimal). */
function decimalToNumber(d: unknown): number | null {
  if (d == null) return null
  if (typeof d === 'number') return Number.isNaN(d) ? null : d
  if (typeof d === 'object' && d !== null && 'toString' in d) return Number(String((d as { toString(): string }).toString())) || null
  return null
}

/** Serialize a bill (and nested payments) so Prisma Decimal fields become numbers. */
function serializeBill<T extends Record<string, unknown>>(bill: T): T {
  const b = bill as Record<string, unknown>
  const out = { ...b } as Record<string, unknown>
  out.valor = Number(decimalToNumber(b.valor) ?? 0)
  out.abono = decimalToNumber(b.abono)
  out.reteFuente = decimalToNumber(b.reteFuente)
  out.descuentos = Array.isArray(b.descuentos)
    ? (b.descuentos as Record<string, unknown>[]).map((d) => ({
        ...d,
        amount: Number(decimalToNumber((d as Record<string, unknown>).amount) ?? 0),
      }))
    : out.descuentos
  out.iva = decimalToNumber(b.iva)
  out.vSinIva = decimalToNumber(b.vSinIva)
  out.vComi = decimalToNumber(b.vComi)
  out.porcentajeComision = Number(decimalToNumber(b.porcentajeComision) ?? 0)
  out.flete = decimalToNumber(b.flete)
  if (Array.isArray(b.payments)) {
    out.payments = (b.payments as Record<string, unknown>[]).map((p) => ({
      ...p,
      amount: Number(decimalToNumber(p.amount) ?? 0),
    }))
  }
  return out as T
}

function serializePayment<T extends Record<string, unknown>>(p: T): T {
  return { ...p, amount: Number(decimalToNumber((p as Record<string, unknown>).amount) ?? 0) } as T
}

function serializeDescuento<T extends Record<string, unknown>>(d: T): T {
  return {
    ...d,
    amount: Number(decimalToNumber((d as Record<string, unknown>).amount) ?? 0),
  } as T
}

// --- Ciudades
export const listCiudades = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async (ctx) => {
    const ciudades = await db.ciudad.findMany({
      where: { userId: ctx.data.userId },
      orderBy: { nombre: 'asc' },
    })
    return ciudades
  })

export const createCiudad = createServerFn({ method: 'POST' })
  .inputValidator((data: { nombre: string; userId: string }) => data)
  .handler(async (ctx) => {
    const { nombre, userId } = ctx.data
    return db.ciudad.create({
      data: { nombre: nombre.trim(), userId },
    })
  })

// --- Clientes
export const listClientes = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async (ctx) => {
    const clientes = await db.cliente.findMany({
      where: { userId: ctx.data.userId },
      include: { ciudad: true },
      orderBy: { nombre: 'asc' },
    })
    return clientes
  })

export const createCliente = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { nombre: string; nit: string; direccion?: string; ciudadId: string; userId: string }) =>
      data
  )
  .handler(async (ctx) => {
    const { userId, ...rest } = ctx.data
    const nit = rest.nit.trim()
    if (!nit) {
      throw new Error('El NIT es requerido')
    }

    // Validate uniqueness by (userId, nit): if it exists, return it (so the UI selects it).
    const existing = await db.cliente.findUnique({
      where: { userId_nit: { userId, nit } },
      include: { ciudad: true },
    })
    if (existing) return existing

    return db.cliente.create({
      data: {
        userId,
        nombre: rest.nombre.trim(),
        nit,
        direccion: rest.direccion?.trim() || null,
        ciudadId: rest.ciudadId,
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
  .inputValidator((data: { userId: string }) => data)
  .handler(async (ctx) => {
    const vendedores = await db.vendedor.findMany({
      where: { userId: ctx.data.userId },
      orderBy: { nombre: 'asc' },
    })
    return vendedores
  })

export const createVendedor = createServerFn({ method: 'POST' })
  .inputValidator((data: { nombre: string; userId: string }) => data)
  .handler(async (ctx) => {
    const { nombre, userId } = ctx.data
    return db.vendedor.create({
      data: { nombre: nombre.trim(), userId },
    })
  })

// --- Bills (facturas) — compute derived amounts (stored as numbers; Prisma accepts them for Decimal)
function computeBillFields(valor: number, pct: number) {
  const vSinIva = valor / 1.19
  const iva = valor - vSinIva
  const vComi = vSinIva * pct
  return { vSinIva, vComi, iva }
}

export const listBills = createServerFn({ method: 'POST' })
  .inputValidator(
    (opts: { userId: string; vendedorId?: string; clienteId?: string; estado?: BillEstado }) =>
      opts,
  )
  .handler(async (ctx) => {
    const opts = ctx.data
    const bills = await db.bill.findMany({
      where: {
        userId: opts.userId,
        ...(opts.vendedorId && { vendedorId: opts.vendedorId }),
        ...(opts.clienteId && { clienteId: opts.clienteId }),
        ...(opts.estado && { estado: opts.estado }),
      },
      include: {
        cliente: true,
        ciudad: true,
        vendedor: true,
        settlement: true,
        payments: true,
        descuentos: true,
      },
      // Primary: número de factura (FV). Secondary: fecha (mismo FV puede existir en otro cliente).
      orderBy: [{ fv: 'asc' }, { fecha: 'desc' }],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return bills.map((b) => serializeBill(b as unknown as Record<string, unknown>)) as any
  })

export const createBill = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      userId: string
      clienteId: string
      fv: number
      ciudadId: string
      vendedorId: string
      valor: number
      conditioned?: boolean
      fecha?: string
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
    const abono = toNum(data.abono)
    const pct = data.porcentajeComision ?? 0.05
    const { vSinIva, vComi, iva } = computeBillFields(valor, pct)
    const fecha = data.fecha ? new Date(data.fecha) : new Date()
    try {
      const bill = await db.bill.create({
        data: {
          userId: data.userId,
          clienteId: data.clienteId,
          ciudadId: data.ciudadId,
          vendedorId: data.vendedorId,
          fv: data.fv,
          fecha,
          valor,
          abono,
          reteFuente: toNum(data.reteFuente),
          iva,
          vSinIva,
          vComi,
          porcentajeComision: pct,
          flete: toNum(data.flete),
          comentarios: data.comentarios?.trim() || null,
          conditioned: data.conditioned ?? false,
        },
        include: { cliente: true, ciudad: true, vendedor: true },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { ok: true as const, bill: serializeBill(bill as unknown as Record<string, unknown>) } as any
    } catch (err: unknown) {
      const prisma = err as { code?: string }
      if (prisma?.code === 'P2002') {
        return {
          ok: false as const,
          error:
            'Ya existe una factura con este número (FV) para este cliente. Use otro número de factura.',
        }
      }
      throw err
    }
  })

export const updateBill = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      userId: string
      id: string
      valor?: number
      conditioned?: boolean
      abono?: number | null
      reteFuente?: number | null
      flete?: number | null
      comentarios?: string | null
      fecha?: string
    }) => data
  )
  .handler(async (ctx) => {
    const { id, userId, ...rest } = ctx.data
    const existing = await db.bill.findFirstOrThrow({ where: { id, userId } })
    const valor = rest.valor !== undefined ? Number(rest.valor) : Number(existing.valor)
    const pct = Number(existing.porcentajeComision)
    const { vSinIva, vComi, iva } = computeBillFields(valor, pct)
    const updated = await db.bill.update({
      where: { id },
      data: {
        ...(rest.valor !== undefined && { valor }),
        ...(rest.conditioned !== undefined && { conditioned: rest.conditioned }),
        ...(rest.abono !== undefined && { abono: rest.abono }),
        ...(rest.reteFuente !== undefined && { reteFuente: toNum(rest.reteFuente) }),
        ...(rest.flete !== undefined && { flete: rest.flete }),
        ...(rest.comentarios !== undefined && { comentarios: rest.comentarios?.trim() || null }),
        ...(rest.fecha && { fecha: new Date(rest.fecha) }),
        iva,
        vSinIva,
        vComi,
      },
      include: { cliente: true, ciudad: true, vendedor: true },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return serializeBill(updated as unknown as Record<string, unknown>) as any
  })

// --- Bill payments (multi-abonos)
async function recomputeBillAbono(billId: string) {
  const bill = await db.bill.findUniqueOrThrow({
    where: { id: billId },
    include: { payments: true },
  })

  const totalAbono = bill.payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const valor = Number(bill.valor)
  const pct = Number(bill.porcentajeComision)
  const { vSinIva, vComi, iva } = computeBillFields(valor, pct)

  return db.bill.update({
    where: { id: billId },
    data: {
      abono: totalAbono || null,
      iva,
      vSinIva,
      vComi,
    },
    include: { cliente: true, ciudad: true, vendedor: true, payments: true },
  })
}

export const listBillPayments = createServerFn({ method: 'GET' })
  .inputValidator((data: { billId: string }) => data)
  .handler(async (ctx) => {
    const billId = ctx.data.billId
    const payments = await db.billPayment.findMany({
      where: { billId },
      orderBy: { paidAt: 'asc' },
    })
    const total = payments.reduce((s, p) => s + Number(p.amount), 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { payments: payments.map((p) => serializePayment(p as unknown as Record<string, unknown>)), total } as any
  })

export const addBillPayment = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { billId: string; userId: string; amount: number; paidAt: string }) => data,
  )
  .handler(async (ctx) => {
    const { billId, userId, amount, paidAt } = ctx.data
    const cleanAmount = Number(amount)
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      throw new Error('Monto inválido')
    }
    const paidDate = new Date(paidAt)
    await db.billPayment.create({
      data: {
        billId,
        userId,
        amount: cleanAmount,
        paidAt: paidDate,
      },
    })
    const updatedBill = await recomputeBillAbono(billId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return serializeBill(updatedBill as unknown as Record<string, unknown>) as any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return serializeBill(updatedBill as unknown as Record<string, unknown>) as any
  })

// --- Bill descuentos (conceptual discounts)
export const listBillDescuentos = createServerFn({ method: 'GET' })
  .inputValidator((data: { billId: string }) => data)
  .handler(async (ctx) => {
    const billId = ctx.data.billId
    const descuentos = await db.billDescuento.findMany({
      where: { billId },
      orderBy: { createdAt: 'asc' },
    })
    const total = descuentos.reduce((s, d) => s + Number(d.amount), 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      descuentos: descuentos.map((d) => serializeDescuento(d as unknown as Record<string, unknown>)),
      total,
    } as any
  })

export const addBillDescuento = createServerFn({ method: 'POST' })
  .inputValidator((data: { billId: string; userId: string; amount: number; concepto: string }) => data)
  .handler(async (ctx) => {
    const { billId, userId, amount, concepto } = ctx.data
    const cleanAmount = Number(amount)
    const cleanConcepto = concepto.trim()
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      throw new Error('Monto inválido')
    }
    if (!cleanConcepto) {
      throw new Error('Concepto requerido')
    }

    await db.billDescuento.create({
      data: {
        billId,
        userId,
        amount: cleanAmount,
        concepto: cleanConcepto,
      },
    })

    const updatedBill = await db.bill.findUniqueOrThrow({
      where: { id: billId },
      include: { descuentos: true },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return serializeBill(updatedBill as unknown as Record<string, unknown>) as any
  })

export const deleteBillDescuento = createServerFn({ method: 'POST' })
  .inputValidator((data: { descuentoId: string }) => data)
  .handler(async (ctx) => {
    const { descuentoId } = ctx.data
    const existing = await db.billDescuento.findUniqueOrThrow({
      where: { id: descuentoId },
    })
    await db.billDescuento.delete({ where: { id: descuentoId } })

    const updatedBill = await db.bill.findUniqueOrThrow({
      where: { id: existing.billId },
      include: { descuentos: true },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return serializeBill(updatedBill as unknown as Record<string, unknown>) as any
  })

// --- Liquidar / Settlements
export const liquidarFactura = createServerFn({ method: 'POST' })
  .inputValidator((data: { userId: string; billId: string }) => data)
  .handler(async (ctx) => {
    const { userId, billId } = ctx.data
    const bill = await db.bill.findFirstOrThrow({ where: { id: billId, userId }, include: { vendedor: true } })
    if (bill.estado === 'LIQUIDADA') {
      return { ok: false, message: 'Factura ya está liquidada' }
    }
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    let settlement = await db.monthlySettlement.findUnique({
      where: {
        userId_vendedorId_month: { userId, vendedorId: bill.vendedorId, month: monthKey },
      },
    })
    if (!settlement) {
      settlement = await db.monthlySettlement.create({
        data: { userId, vendedorId: bill.vendedorId, month: monthKey },
      })
    }
    await db.bill.update({
      where: { id: billId },
      data: { estado: 'LIQUIDADA', liquidatedAt: now, settlementId: settlement.id },
    })
    return { ok: true, settlementId: settlement.id }
  })

export const removeBillFromSettlement = createServerFn({ method: 'POST' })
  .inputValidator((data: { userId: string; billId: string }) => data)
  .handler(async (ctx) => {
    const { userId, billId } = ctx.data
    await db.bill.update({
      where: { id: billId },
      data: { estado: 'PENDIENTE', liquidatedAt: null, settlementId: null },
    })
    return { ok: true }
  })

// --- Monthly settlements (list by vendedor, get one month)
export const listSettlementsByVendedor = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string; vendedorId: string }) => data)
  .handler(async (ctx) => {
    const { userId, vendedorId } = ctx.data
    const settlements = await db.monthlySettlement.findMany({
      where: { userId, vendedorId },
      include: {
        vendedor: true,
        bills: {
          include: { cliente: true, ciudad: true },
        },
      },
      orderBy: { month: 'desc' },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return settlements.map((s) => ({
      ...s,
      bills: (s.bills as unknown as Record<string, unknown>[]).map((b) => serializeBill(b)),
    })) as any
  })

export const getSettlement = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string; id: string }) => data)
  .handler(async (ctx) => {
    const { userId, id } = ctx.data
    const settlement = await db.monthlySettlement.findFirstOrThrow({
      where: { id, userId },
      include: {
        vendedor: true,
        bills: {
          include: { cliente: true, ciudad: true },
        },
      },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      ...settlement,
      bills: (settlement.bills as unknown as Record<string, unknown>[]).map((b) => serializeBill(b)),
    } as any
  })

// --- Report: account statement (cliente + date range)
export const getAccountStatement = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { userId: string; clienteId: string; desde: string; hasta: string }) => data
  )
  .handler(async (ctx) => {
    const data = ctx.data
    const desde = new Date(data.desde)
    const hasta = new Date(data.hasta)
    const bills = await db.bill.findMany({
      where: {
        userId: data.userId,
        clienteId: data.clienteId,
        fecha: { gte: desde, lte: hasta },
      },
      include: { ciudad: true, vendedor: true, descuentos: true },
      orderBy: [{ fecha: 'asc' }, { fv: 'asc' }],
    })
    const cliente = await db.cliente.findUniqueOrThrow({
      where: { id: data.clienteId },
      include: { ciudad: true },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { cliente, bills: bills.map((b) => serializeBill(b as unknown as Record<string, unknown>)) } as any
  })
