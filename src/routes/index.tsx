import { createFileRoute } from '@tanstack/react-router'
import { AddBillForm } from '../components/cartera/AddBillForm'
import { BillsTable } from '../components/cartera/BillsTable'
import { useQuery } from '@tanstack/react-query'
import { listBills } from '../server/cartera'
import { fmtMoney } from '../lib/utils'
import { useAuth } from '../lib/auth'
import { Banknote, CheckCircle2, FileStack, Hourglass } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: CarteraPage,
})

function CarteraPage() {
  const { user, loading } = useAuth()
  const userId = user?.id

  const { data: billsData } = useQuery({
    queryKey: ['bills', userId],
    queryFn: () => listBills({ data: { userId: userId! } }),
    enabled: Boolean(userId) && !loading,
  })

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

  const bills = (billsData ?? []) as any[]

  const pendientes = bills.filter((b) => b.estado === 'PENDIENTE').length
  const liquidadas = bills.filter((b) => b.estado === 'LIQUIDADA').length
  const valorTotal = bills.reduce((s, b) => s + Number(b.valor?.toString() ?? 0), 0)

  const hoy = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
  const fechaTitulo = hoy.charAt(0).toUpperCase() + hoy.slice(1)

  const stats = [
    {
      label: 'Total facturas',
      display: String(bills.length),
      icon: FileStack,
      accent: 'from-[var(--lagoon)] to-[var(--lagoon-deep)]',
      iconBg: 'bg-[color-mix(in_oklab,var(--lagoon)_22%,transparent)]',
      valueClass: 'text-[var(--sea-ink)]',
    },
    {
      label: 'Pendientes',
      display: String(pendientes),
      icon: Hourglass,
      accent: 'from-[#3b82f6] to-[#1d4ed8]',
      iconBg: 'bg-[color-mix(in_oklab,#3b82f6_20%,transparent)]',
      valueClass: 'text-[#2563eb] dark:text-[#7cb4ff]',
    },
    {
      label: 'Liquidadas',
      display: String(liquidadas),
      icon: CheckCircle2,
      accent: 'from-[var(--palm)] to-[#1f5a38]',
      iconBg: 'bg-[color-mix(in_oklab,var(--palm)_22%,transparent)]',
      valueClass: 'text-[var(--palm)]',
    },
    {
      label: 'Valor total',
      display: fmtMoney(valorTotal),
      icon: Banknote,
      accent: 'from-[var(--sea-ink-soft)] to-[var(--sea-ink)]',
      iconBg: 'bg-[color-mix(in_oklab,var(--sea-ink-soft)_18%,transparent)]',
      valueClass: 'text-[var(--sea-ink)]',
    },
  ] as const

  return (
    <main className="page-wrap px-3 pb-10 pt-10 sm:px-4 sm:pb-12 sm:pt-14">
      <section
        className="rise-in relative z-10 mb-8 overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-gradient-to-br from-[var(--surface-strong)] via-[var(--surface)] to-[color-mix(in_oklab,var(--lagoon)_12%,var(--surface))] px-5 py-8 shadow-[0_24px_48px_rgba(23,58,64,0.08)] sm:px-8 sm:py-10"
        style={{ animationDelay: '40ms' }}
      >
        <div
          className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[var(--hero-a)] opacity-70 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-[var(--hero-b)] opacity-80 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-8 right-10 hidden h-px w-32 rotate-[-18deg] bg-gradient-to-r from-transparent via-[var(--lagoon)]/40 to-transparent sm:block"
          aria-hidden
        />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="island-kicker mb-2">Resumen</p>
            <h1 className="display-title m-0 text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-[1.12] tracking-tight text-[var(--sea-ink)]">
              Cartera
            </h1>
            <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-[var(--sea-ink-soft)] sm:text-[0.9375rem]">
              Seguimiento de facturas, saldos y cobros en un solo panel. {fechaTitulo}.
            </p>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
            <AddBillForm userId={user.id} />
            <span className="text-center text-[11px] text-[var(--sea-ink-soft)] sm:text-right">
              Registra ventas y mantén el flujo al día
            </span>
          </div>
        </div>
      </section>

      <div className="relative z-0 mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <div
              key={s.label}
              className="rise-in group relative overflow-hidden rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[var(--surface-strong)] to-[var(--surface)] p-4 shadow-[0_18px_36px_rgba(23,58,64,0.07)] transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_22px_44px_rgba(23,58,64,0.1)]"
              style={{ animationDelay: `${120 + i * 70}ms` }}
            >
              <div
                className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${s.accent} opacity-90`}
                aria-hidden
              />
              <div className="mb-3 flex items-start justify-between gap-2 pl-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.iconBg} text-[var(--sea-ink)] transition-transform duration-300 group-hover:scale-105`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
              </div>
              <p className="island-kicker mb-1 pl-2">{s.label}</p>
              <p
                className={`display-title pl-2 text-2xl font-bold tabular-nums tracking-tight sm:text-[1.65rem] ${s.valueClass} ${s.label === 'Valor total' ? 'truncate' : ''}`}
              >
                {s.display}
              </p>
            </div>
          )
        })}
      </div>

      <section className="rise-in relative z-0" style={{ animationDelay: '420ms' }}>
        <div className="mb-5 flex flex-col gap-2 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="display-title m-0 text-xl font-bold text-[var(--sea-ink)] sm:text-2xl">
              Facturas
            </h2>
            <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
              Filtra, revisa detalles y gestiona el estado de cada registro.
            </p>
          </div>
        </div>
        <BillsTable userId={user.id} />
      </section>
    </main>
  )
}
