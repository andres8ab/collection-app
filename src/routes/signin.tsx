import { useState } from 'react'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/signin')({
  component: SignInPage,
})

function SignInPage() {
  const { user, loading, signIn } = useAuth()
  const search = useSearch({ from: '/signin' }) as { redirect?: string }
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && user) {
    // Already signed in, just show a small message
    return (
      <main className="page-wrap flex min-h-[70vh] items-center justify-center px-3 py-8 sm:px-4">
        <div className="island-shell w-full max-w-md rounded-2xl p-4 sm:p-8">
          <p className="island-kicker mb-2">Sesión iniciada</p>
          <h1 className="display-title mb-3 text-2xl font-bold text-[var(--sea-ink)] sm:text-3xl">
            Ya estás autenticado
          </h1>
          <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">
            Puedes empezar a trabajar en la cartera desde el panel principal.
          </p>
          <a
            href={search.redirect ?? '/'}
            className="inline-flex items-center justify-center rounded-xl bg-[var(--lagoon)] px-4 py-2 text-sm font-semibold text-white no-underline hover:opacity-90"
          >
            Ir al panel
          </a>
        </div>
      </main>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await signIn(email.trim())
      const redirectTo = search.redirect ?? '/'
      window.location.assign(redirectTo)
    } catch (err) {
      setError((err as Error).message || 'No se pudo iniciar sesión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="page-wrap flex min-h-[70vh] items-center justify-center px-3 py-8 sm:px-4">
      <section className="island-shell w-full max-w-md rounded-2xl p-4 sm:p-8">
        <p className="island-kicker mb-2">Acceso</p>
        <h1 className="display-title mb-3 text-2xl font-bold text-[var(--sea-ink)] sm:text-3xl">
          Inicia sesión
        </h1>
        <p className="mb-6 text-sm text-[var(--sea-ink-soft)]">
          Usa el correo del usuario configurado en Neon. No hay registro desde la
          aplicación: sólo validamos que el usuario exista para habilitar el panel.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--sea-ink-soft)]">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              placeholder="tu-correo@empresa.com"
              required
            />
          </div>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center rounded-xl bg-[var(--lagoon)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? 'Verificando...' : 'Entrar'}
          </button>
          <p className="mt-3 text-center text-xs text-[var(--sea-ink-soft)]">
            Sólo se guarda una copia básica del usuario en tu navegador (localStorage) para
            mantener la sesión mientras trabajas.
          </p>
        </form>
      </section>
    </main>
  )
}

