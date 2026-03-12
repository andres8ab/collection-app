import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listVendedores,
  listSettlementsByVendedor,
  removeBillFromSettlement,
} from '../server/cartera'
import { fmtMoney, getMesLabel } from '../lib/utils'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/liquidaciones')({
  component: LiquidacionesPage,
})

function toNum(d: { toString(): string } | null | undefined): number {
  if (d == null) return 0
  return parseFloat(d.toString())
}

function LiquidacionesPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <main className="page-wrap flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-sm text-[var(--sea-ink-soft)]">Verificando sesión...</div>
      </main>
    )
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      const redirect = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.assign(`/signin?redirect=${redirect}`)
    }
    return null
  }

  const queryClient = useQueryClient()
  const [vendedorId, setVendedorId] = useState('')
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null)

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => listVendedores({ data: undefined }),
  })

  const { data: settlements = [] } = useQuery({
    queryKey: ['settlements', vendedorId],
    queryFn: () => listSettlementsByVendedor({ data: vendedorId }),
    enabled: !!vendedorId,
  })

  const selectedSettlement = selectedSettlementId
    ? settlements.find((s) => s.id === selectedSettlementId)
    : null

  const removeMutation = useMutation({
    mutationFn: (billId: string) => removeBillFromSettlement({ data: billId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['bills'] })
    },
  })

  const totalComision = selectedSettlement?.bills.reduce(
    (s, b) => s + toNum(b.vComi),
    0
  ) ?? 0
  const totalValor = selectedSettlement?.bills.reduce(
    (s, b) => s + toNum(b.valor),
    0
  ) ?? 0

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <h1 className="display-title mb-6 text-2xl font-bold text-[var(--sea-ink)] sm:text-3xl">
        Liquidaciones mensuales
      </h1>

      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium text-[var(--sea-ink-soft)]">
          Vendedor
        </label>
        <select
          value={vendedorId}
          onChange={(e) => {
            setVendedorId(e.target.value)
            setSelectedSettlementId(null)
          }}
          className="w-full max-w-xs rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
        >
          <option value="">Seleccione vendedor</option>
          {vendedores.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nombre}
            </option>
          ))}
        </select>
      </div>

      {!vendedorId ? (
        <div className="island-shell rounded-2xl p-12 text-center text-[var(--sea-ink-soft)]">
          Seleccione un vendedor para ver sus liquidaciones.
        </div>
      ) : settlements.length === 0 ? (
        <div className="island-shell rounded-2xl p-12 text-center text-[var(--sea-ink-soft)]">
          No hay liquidaciones para este vendedor.
        </div>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="w-full lg:w-64 shrink-0">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
              Meses
            </div>
            <ul className="space-y-2">
              {settlements.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedSettlementId(s.id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                      selectedSettlementId === s.id
                        ? 'border-[var(--lagoon)] bg-[var(--link-bg-hover)]'
                        : 'border-[var(--line)] hover:border-[var(--lagoon-deep)]'
                    }`}
                  >
                    <div className="font-semibold">{getMesLabel(s.month)}</div>
                    <div className="text-[var(--sea-ink-soft)]">
                      {s.bills.length} factura{s.bills.length !== 1 ? 's' : ''}
                    </div>
                    <div className="font-semibold text-emerald-600">
                      {fmtMoney(s.bills.reduce((a, b) => a + toNum(b.vComi), 0))}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 flex-1">
            {!selectedSettlement ? (
              <div className="island-shell rounded-2xl p-12 text-center text-[var(--sea-ink-soft)]">
                Seleccione un mes.
              </div>
            ) : (
              <>
                <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="island-shell rounded-xl p-4">
                    <div className="text-lg font-bold">{getMesLabel(selectedSettlement.month)}</div>
                    <div className="text-sm text-[var(--sea-ink-soft)]">Mes</div>
                  </div>
                  <div className="island-shell rounded-xl p-4">
                    <div className="text-lg font-bold">{selectedSettlement.bills.length}</div>
                    <div className="text-sm text-[var(--sea-ink-soft)]">Facturas</div>
                  </div>
                  <div className="island-shell rounded-xl p-4">
                    <div className="text-lg font-bold text-blue-600">{fmtMoney(totalValor)}</div>
                    <div className="text-sm text-[var(--sea-ink-soft)]">Valor total</div>
                  </div>
                  <div className="island-shell rounded-xl p-4">
                    <div className="text-lg font-bold text-emerald-600">{fmtMoney(totalComision)}</div>
                    <div className="text-sm text-[var(--sea-ink-soft)]">Total comisión</div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[var(--line)] bg-[var(--header-bg)]">
                        <th className="px-3 py-2 text-left font-semibold uppercase text-[var(--sea-ink-soft)]">
                          Cliente
                        </th>
                        <th className="px-3 py-2 text-left font-semibold uppercase text-[var(--sea-ink-soft)]">
                          FV
                        </th>
                        <th className="px-3 py-2 text-left font-semibold uppercase text-[var(--sea-ink-soft)]">
                          Fecha
                        </th>
                        <th className="px-3 py-2 text-right font-semibold uppercase text-[var(--sea-ink-soft)]">
                          Valor
                        </th>
                        <th className="px-3 py-2 text-right font-semibold uppercase text-[var(--sea-ink-soft)]">
                          Comisión
                        </th>
                        <th className="px-3 py-2 text-center font-semibold uppercase text-[var(--sea-ink-soft)]">
                          Quitar
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSettlement.bills.map((b) => (
                        <tr key={b.id} className="border-b border-[var(--line)]">
                          <td className="px-3 py-2">{b.cliente?.nombre ?? '—'}</td>
                          <td className="px-3 py-2">{b.fv}</td>
                          <td className="px-3 py-2">
                            {new Date(b.fecha).toLocaleDateString('es-CO')}
                          </td>
                          <td className="px-3 py-2 text-right">{fmtMoney(toNum(b.valor))}</td>
                          <td className="px-3 py-2 text-right text-emerald-600">
                            {fmtMoney(toNum(b.vComi))}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeMutation.mutate(b.id)}
                              disabled={removeMutation.isPending}
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
                        <td colSpan={3} className="px-3 py-2">
                          Totales
                        </td>
                        <td className="px-3 py-2 text-right">{fmtMoney(totalValor)}</td>
                        <td className="px-3 py-2 text-right text-emerald-600">
                          {fmtMoney(totalComision)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
