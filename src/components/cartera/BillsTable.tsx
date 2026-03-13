import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
  listBills,
  liquidarFactura,
  updateBill,
  listBillPayments,
  addBillPayment,
  deleteBillPayment,
} from '../../server/cartera'
import { fmtMoney, fmtNum, getMesLabel, toDecimalValue } from '../../lib/utils'
type BillWithRelations = {
  id: string
  fv: number
  fecha: Date
  valor: { toString(): string }
  devo: { toString(): string } | null
  abono: { toString(): string } | null
  reteFuente: { toString(): string } | null
  iva: { toString(): string } | null
  vSinIva: { toString(): string } | null
  vComi: { toString(): string } | null
  comentarios: string | null
  estado: 'PENDIENTE' | 'LIQUIDADA'
  cliente: { id: string; nombre: string }
  ciudad: { id: string; nombre: string }
  vendedor: { id: string; nombre: string }
  settlement?: { id: string; month: string } | null
  payments?: { id: string; amount: { toString(): string }; paidAt: Date }[]
  dias?: number
}

const COLS: { key: keyof BillWithRelations | 'saldo'; label: string; money?: boolean }[] = [
  { key: 'cliente', label: 'Cliente' },
  { key: 'fv', label: 'FV' },
  { key: 'fecha', label: 'Fecha' },
  { key: 'dias', label: 'Días' },
  { key: 'ciudad', label: 'Ciudad' },
  { key: 'vendedor', label: 'Vendedor' },
  { key: 'valor', label: 'Valor', money: true },
  { key: 'devo', label: 'Devo.', money: true },
  { key: 'abono', label: 'Abono', money: true },
  { key: 'saldo', label: 'Saldo', money: true },
  { key: 'reteFuente', label: 'Rete Fuente', money: true },
  { key: 'iva', label: 'IVA', money: true },
  { key: 'vSinIva', label: 'V. Sin IVA', money: true },
  { key: 'vComi', label: 'V. Comi.', money: true },
  { key: 'estado', label: 'Estado' },
]

function getDias(fecha: Date | string): number {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

function getSaldo(b: BillWithRelations): number {
  const v = toDecimalValue(b.valor)
  const d = toDecimalValue(b.devo)
  const a = toDecimalValue(b.abono)
  return v - d - a
}

function getAbonoTotal(b: BillWithRelations): number {
  if (b.payments && b.payments.length > 0) {
    return b.payments.reduce((sum, p) => sum + toDecimalValue(p.amount), 0)
  }
  return toDecimalValue(b.abono)
}

function cellValue(b: BillWithRelations, col: (typeof COLS)[number]): string | number {
  if (col.key === 'cliente') return b.cliente?.nombre ?? '—'
  if (col.key === 'ciudad') return b.ciudad?.nombre ?? '—'
  if (col.key === 'vendedor') return b.vendedor?.nombre ?? '—'
  if (col.key === 'fecha') return new Date(b.fecha).toLocaleDateString('es-CO')
  if (col.key === 'dias') return getDias(b.fecha)
  if (col.key === 'saldo') return getSaldo(b)
  if (col.key === 'estado') return b.estado
  const val = b[col.key as keyof BillWithRelations]
  if (val == null) return '—'
  if (typeof val === 'object' && 'toString' in val) return (val as { toString(): string }).toString()
  return val as string | number
}

export function BillsTable() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<string | null>(null)
  const [editDevo, setEditDevo] = useState('')
  const [editComentarios, setEditComentarios] = useState('')
  const [paymentsBillId, setPaymentsBillId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['bills'],
    queryFn: () => listBills({ data: undefined }),
  })

  const bills = (data ?? []) as BillWithRelations[]

  const liquidarMutation = useMutation({
    mutationFn: (billId: string) => liquidarFactura({ data: billId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
    },
  })

  const updateBillMutation = useMutation({
    mutationFn: (data: {
      id: string
      devo?: number | null
      abono?: number | null
      comentarios?: string | null
    }) => updateBill({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      setEditing(null)
    },
  })

  const startEdit = (b: BillWithRelations) => {
    setEditing(b.id)
    setEditDevo(b.devo != null ? String(toDecimalValue(b.devo)) : '')
    setEditComentarios(b.comentarios ?? '')
  }

  const saveEdit = (id: string) => {
    const devo = editDevo.trim() ? parseFloat(editDevo.replace(/,/g, '')) : null
    updateBillMutation.mutate({
      id,
      devo: Number.isNaN(devo as number) ? undefined : devo ?? undefined,
      comentarios: editComentarios.trim() || null,
    })
  }

  if (isLoading) return <div className="py-8 text-center text-[var(--sea-ink-soft)]">Cargando facturas...</div>

  return (
    <div className="responsive-table-wrap rounded-xl border border-[var(--line)]">
      <table className="w-full min-w-[800px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] bg-[var(--header-bg)]">
            {COLS.map((col) => (
              <th
                key={col.key}
                className="whitespace-nowrap px-2 py-2 text-left font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)] sm:px-3"
              >
                {col.label}
              </th>
            ))}
            <th className="whitespace-nowrap px-2 py-2 text-center font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)] sm:px-3">
              Acción
            </th>
          </tr>
        </thead>
        <tbody>
          {bills.map((b) => {
            const isEditing = editing === b.id
            return (
              <tr key={b.id} className="border-b border-[var(--line)] hover:bg-[var(--link-bg-hover)]">
                {COLS.map((col) => (
                  <td key={col.key} className="px-2 py-2 text-[var(--sea-ink)] sm:px-3">
                    {col.key === 'devo' && isEditing ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editDevo}
                        onChange={(e) => setEditDevo(e.target.value)}
                        className="w-24 rounded border border-[var(--line)] bg-[var(--surface)] px-1 py-0.5 text-sm"
                      />
                    ) : col.key === 'abono' ? (
                      <button
                        type="button"
                        onClick={() => setPaymentsBillId(b.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-xs font-medium text-[var(--sea-ink)] hover:border-[var(--lagoon-deep)] hover:bg-[var(--link-bg-hover)]"
                      >
                        <span>{fmtMoney(getAbonoTotal(b))}</span>
                        <span className="text-[0.7rem] text-[var(--sea-ink-soft)]">
                          {b.payments && b.payments.length > 0
                            ? `${b.payments.length} pago${b.payments.length !== 1 ? 's' : ''}`
                            : 'Agregar'}
                        </span>
                      </button>
                    ) : col.key === 'estado' ? (
                      <span
                        className={
                          b.estado === 'LIQUIDADA'
                            ? 'rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs font-semibold text-emerald-600'
                            : 'rounded-full bg-blue-900/30 px-2 py-0.5 text-xs font-semibold text-blue-600'
                        }
                      >
                        {b.estado}
                      </span>
                    ) : col.money ? (
                      fmtMoney(typeof cellValue(b, col) === 'number' ? cellValue(b, col) : parseFloat(String(cellValue(b, col))) || 0)
                    ) : col.key === 'dias' ? (
                      fmtNum(cellValue(b, col))
                    ) : (
                      String(cellValue(b, col))
                    )}
                  </td>
                ))}
                <td className="px-2 py-2 sm:px-3">
                  {isEditing ? (
                    <div className="flex flex-wrap items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => saveEdit(b.id)}
                        className="rounded bg-[var(--lagoon)] px-2 py-1 text-xs font-medium text-white hover:opacity-90"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="rounded border border-[var(--line)] px-2 py-1 text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : b.estado === 'PENDIENTE' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => liquidarMutation.mutate(b.id)}
                        disabled={liquidarMutation.isPending}
                        className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Liquidar
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(b)}
                        className="ml-1 rounded border border-[var(--line)] px-2 py-1 text-xs hover:bg-[var(--link-bg-hover)]"
                      >
                        Editar
                      </button>
                    </>
                  ) : b.settlement?.month ? (
                    <span className="text-xs text-[var(--sea-ink-soft)]">
                      ✓ {getMesLabel(b.settlement.month)}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--sea-ink-soft)]">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {bills.length === 0 && (
        <div className="py-12 text-center text-[var(--sea-ink-soft)]">
          No hay facturas. Use &quot;Nueva factura&quot; para agregar.
        </div>
      )}
      {paymentsBillId && (
        <BillPaymentsModal
          bill={bills.find((b) => b.id === paymentsBillId)!}
          onClose={() => setPaymentsBillId(null)}
        />
      )}
    </div>
  )
}

type BillPaymentsModalProps = {
  bill: BillWithRelations
  onClose: () => void
}

function BillPaymentsModal({ bill, onClose }: BillPaymentsModalProps) {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  const { data } = useQuery({
    queryKey: ['billPayments', bill.id],
    queryFn: () => listBillPayments({ data: bill.id }),
  })

  const payments = data?.payments ?? bill.payments ?? []
  const total = useMemo(
    () =>
      payments.reduce(
        (sum: number, p: { amount: { toString(): string } }) => sum + toDecimalValue(p.amount),
        0,
      ),
    [payments],
  )

  const addMutation = useMutation({
    mutationFn: (payload: { amount: number; paidAt: string }) =>
      addBillPayment({ data: { billId: bill.id, amount: payload.amount, paidAt: payload.paidAt } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billPayments', bill.id] })
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      setAmount('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (paymentId: string) => deleteBillPayment({ data: { paymentId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billPayments', bill.id] })
      queryClient.invalidateQueries({ queryKey: ['bills'] })
    },
  })

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const value = amount.trim().replace(/,/g, '')
    const num = parseFloat(value)
    if (!value || Number.isNaN(num) || num <= 0) return
    if (!date) return
    addMutation.mutate({ amount: num, paidAt: date })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4">
      <div className="island-shell max-h-[90vh] w-full max-w-lg overflow-hidden rounded-t-2xl bg-[var(--surface-strong)] pb-[env(safe-area-inset-bottom)] sm:rounded-2xl sm:pb-0">
        <div className="flex items-start justify-between gap-2 border-b border-[var(--line)] px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="island-kicker mb-1">Abonos</p>
            <h2 className="display-title m-0 truncate text-lg font-bold text-[var(--sea-ink)] sm:text-xl">
              FV {bill.fv} · {bill.cliente?.nombre ?? ''}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--line)] px-2 py-1 text-xs text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]"
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-4 px-4 py-3 sm:px-5 sm:py-4">
          <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--sea-ink-soft)]">
                Monto
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-32 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm"
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--sea-ink-soft)]">
                Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="mt-1 inline-flex items-center justify-center rounded-xl bg-[var(--lagoon)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              Agregar pago
            </button>
          </form>

          <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
            {payments.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[var(--sea-ink-soft)]">
                No hay pagos registrados para esta factura.
              </div>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--header-bg)]">
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">
                      Fecha
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">
                      Monto
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">
                      Eliminar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p: { id: string; amount: { toString(): string }; paidAt: Date }) => (
                    <tr key={p.id} className="border-b border-[var(--line)]">
                      <td className="px-3 py-2">
                        {new Date(p.paidAt).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {fmtMoney(toDecimalValue(p.amount))}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(p.id)}
                          disabled={deleteMutation.isPending}
                          className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--line)] font-semibold">
                    <td className="px-3 py-2 text-right">Total</td>
                    <td className="px-3 py-2 text-right text-emerald-600">
                      {fmtMoney(total)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}