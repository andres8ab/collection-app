import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listClientes, getAccountStatement } from '../server/cartera'
import { fmtMoney } from '../lib/utils'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/reportes')({
  component: ReportesPage,
})

function toNum(d: { toString(): string } | null | undefined): number {
  if (d == null) return 0
  return parseFloat(d.toString())
}

function ReportesPage() {
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

  const [clienteId, setClienteId] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [request, setRequest] = useState<{
    clienteId: string
    desde: string
    hasta: string
  } | null>(null)

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => listClientes({ data: undefined }),
  })

  const { data: statement, isLoading } = useQuery({
    queryKey: ['accountStatement', request?.clienteId, request?.desde, request?.hasta],
    queryFn: () =>
      request
        ? getAccountStatement({
            data: {
              clienteId: request.clienteId,
              desde: request.desde,
              hasta: request.hasta,
            },
          })
        : Promise.resolve(null),
    enabled: !!request?.clienteId && !!request?.desde && !!request?.hasta,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (clienteId && desde && hasta) {
      setRequest({ clienteId, desde, hasta })
    }
  }

  const totalValor = statement?.bills.reduce((s, b) => s + toNum(b.valor), 0) ?? 0
  const totalAbono = statement?.bills.reduce((s, b) => s + toNum(b.abono), 0) ?? 0
  const totalSaldo = statement?.bills.reduce(
    (s, b) => s + toNum(b.valor) - toNum(b.devo) - toNum(b.abono),
    0
  ) ?? 0

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <h1 className="display-title mb-6 text-2xl font-bold text-[var(--sea-ink)] sm:text-3xl">
        Reportes
      </h1>

      <section className="island-shell mb-8 rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--sea-ink)]">
          Estado de cuenta
        </h2>
        <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">
          Seleccione un cliente y rango de fechas para ver el estado de cuenta.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4">
          <div className="min-w-[200px]">
            <label className="mb-1 block text-sm font-medium text-[var(--sea-ink-soft)]">
              Cliente
            </label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              required
            >
              <option value="">Seleccione cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--sea-ink-soft)]">
              Desde
            </label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--sea-ink-soft)]">
              Hasta
            </label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-xl bg-[var(--lagoon)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Generar
            </button>
          </div>
        </form>
      </section>

      {isLoading && request && (
        <div className="py-8 text-center text-[var(--sea-ink-soft)]">Cargando...</div>
      )}

      {statement && !isLoading && (
        <section className="island-shell rounded-2xl p-6">
          <h2 className="mb-2 text-lg font-semibold text-[var(--sea-ink)]">
            Estado de cuenta: {statement.cliente.nombre}
          </h2>
          <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">
            {statement.cliente.ciudad?.nombre}
            {statement.cliente.nit && ` · NIT ${statement.cliente.nit}`}
          </p>
          <p className="mb-6 text-sm text-[var(--sea-ink-soft)]">
            Del {new Date(request!.desde).toLocaleDateString('es-CO')} al{' '}
            {new Date(request!.hasta).toLocaleDateString('es-CO')}
          </p>

          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <div className="text-sm text-[var(--sea-ink-soft)]">Valor total</div>
              <div className="text-xl font-bold">{fmtMoney(totalValor)}</div>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <div className="text-sm text-[var(--sea-ink-soft)]">Total abonado</div>
              <div className="text-xl font-bold">{fmtMoney(totalAbono)}</div>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <div className="text-sm text-[var(--sea-ink-soft)]">Saldo</div>
              <div className={`text-xl font-bold ${totalSaldo > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {fmtMoney(totalSaldo)}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--header-bg)]">
                  <th className="px-3 py-2 text-left font-semibold uppercase text-[var(--sea-ink-soft)]">
                    Fecha
                  </th>
                  <th className="px-3 py-2 text-left font-semibold uppercase text-[var(--sea-ink-soft)]">
                    FV
                  </th>
                  <th className="px-3 py-2 text-left font-semibold uppercase text-[var(--sea-ink-soft)]">
                    Ciudad
                  </th>
                  <th className="px-3 py-2 text-right font-semibold uppercase text-[var(--sea-ink-soft)]">
                    Valor
                  </th>
                  <th className="px-3 py-2 text-right font-semibold uppercase text-[var(--sea-ink-soft)]">
                    Devo.
                  </th>
                  <th className="px-3 py-2 text-right font-semibold uppercase text-[var(--sea-ink-soft)]">
                    Abono
                  </th>
                  <th className="px-3 py-2 text-right font-semibold uppercase text-[var(--sea-ink-soft)]">
                    Saldo
                  </th>
                  <th className="px-3 py-2 text-left font-semibold uppercase text-[var(--sea-ink-soft)]">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {statement.bills.map((b) => {
                  const saldo = toNum(b.valor) - toNum(b.devo) - toNum(b.abono)
                  return (
                    <tr key={b.id} className="border-b border-[var(--line)]">
                      <td className="px-3 py-2">
                        {new Date(b.fecha).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-3 py-2">{b.fv}</td>
                      <td className="px-3 py-2">{b.ciudad?.nombre ?? '—'}</td>
                      <td className="px-3 py-2 text-right">{fmtMoney(toNum(b.valor))}</td>
                      <td className="px-3 py-2 text-right">{fmtMoney(toNum(b.devo))}</td>
                      <td className="px-3 py-2 text-right">{fmtMoney(toNum(b.abono))}</td>
                      <td className="px-3 py-2 text-right">{fmtMoney(saldo)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            b.estado === 'LIQUIDADA'
                              ? 'rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs font-semibold text-emerald-600'
                              : 'rounded-full bg-blue-900/30 px-2 py-0.5 text-xs font-semibold text-blue-600'
                          }
                        >
                          {b.estado}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!request && (
        <div className="island-shell rounded-2xl p-12 text-center text-[var(--sea-ink-soft)]">
          Complete cliente y rango de fechas y pulse Generar.
        </div>
      )}
    </main>
  )
}
