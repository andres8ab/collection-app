import { createFileRoute } from '@tanstack/react-router'
import { AddBillForm } from '../components/cartera/AddBillForm'
import { BillsTable } from '../components/cartera/BillsTable'
import { useQuery } from '@tanstack/react-query'
import { listBills } from '../server/cartera'
import { fmtMoney } from '../lib/utils'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/')({
  component: CarteraPage,
})

function CarteraPage() {
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

  const { data: billsData } = useQuery({
    queryKey: ['bills'],
    queryFn: () => listBills({ data: undefined }),
  })

  const bills = (billsData ?? []) as any[]

  const pendientes = bills.filter((b) => b.estado === 'PENDIENTE').length
  const liquidadas = bills.filter((b) => b.estado === 'LIQUIDADA').length
  const valorTotal = bills.reduce((s, b) => s + Number(b.valor?.toString() ?? 0), 0)

  return (
    <main className="page-wrap px-3 pb-8 pt-10 sm:px-4 sm:pt-14">
      <section className="relative z-10 mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h1 className="display-title m-0 text-2xl font-bold text-[var(--sea-ink)] sm:text-3xl">
          Cartera
        </h1>
        <div className="w-full sm:w-auto">
          <AddBillForm />
        </div>
      </section>

      <div className="relative z-0 mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <div className="island-shell rounded-xl p-3 sm:p-4">
          <div className="text-xl font-bold text-[var(--sea-ink)] sm:text-2xl">{bills.length}</div>
          <div className="text-xs text-[var(--sea-ink-soft)] sm:text-sm">Total facturas</div>
        </div>
        <div className="island-shell rounded-xl p-3 sm:p-4">
          <div className="text-xl font-bold text-blue-600 sm:text-2xl">{pendientes}</div>
          <div className="text-xs text-[var(--sea-ink-soft)] sm:text-sm">Pendientes</div>
        </div>
        <div className="island-shell rounded-xl p-3 sm:p-4">
          <div className="text-xl font-bold text-emerald-600 sm:text-2xl">{liquidadas}</div>
          <div className="text-xs text-[var(--sea-ink-soft)] sm:text-sm">Liquidadas</div>
        </div>
        <div className="island-shell rounded-xl p-3 sm:p-4">
          <div className="truncate text-xl font-bold text-[var(--sea-ink)] sm:text-2xl">{fmtMoney(valorTotal)}</div>
          <div className="text-xs text-[var(--sea-ink-soft)] sm:text-sm">Valor total</div>
        </div>
      </div>

      <BillsTable />
    </main>
  )
}
