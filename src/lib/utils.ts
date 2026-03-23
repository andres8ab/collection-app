export function fmtMoney(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)
}

export function fmtNum(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('es-CO').format(n)
}

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function getMesLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-')
  const i = parseInt(m, 10) - 1
  return `${MESES[i] ?? m} ${y}`
}

export function toDecimalValue(d: { toString(): string } | number | string | null | undefined): number {
  if (d == null) return 0
  if (typeof d === 'number') return Number.isNaN(d) ? 0 : d
  if (typeof d === 'string') return parseFloat(d) || 0
  return parseFloat(d.toString()) || 0
}

type BillAmountLike = { toString(): string } | number | string | null | undefined

type BillSaldoInput = {
  valor: BillAmountLike
  abono?: BillAmountLike
  reteFuente?: BillAmountLike
  descuentos?: Array<{ amount: BillAmountLike }>
}

export function getBillDescuentoTotal(bill: Pick<BillSaldoInput, 'descuentos'>): number {
  if (!bill.descuentos || bill.descuentos.length === 0) return 0
  return bill.descuentos.reduce((sum, d) => sum + toDecimalValue(d.amount), 0)
}

export function getBillSaldo(bill: BillSaldoInput): number {
  const valor = toDecimalValue(bill.valor)
  const abono = toDecimalValue(bill.abono)
  const reteFuente = toDecimalValue(bill.reteFuente)
  const descuentos = getBillDescuentoTotal(bill)
  return valor - abono - reteFuente - descuentos
}
