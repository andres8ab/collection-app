import { useState } from 'react'
import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/signup')({
  component: SignUpPage,
})

function SignUpPage() {
  const { user, loading, signUp } = useAuth()
  const search = useSearch({ from: '/signup' }) as { redirect?: string }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && user) {
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
          <Link
            to={search.redirect ?? '/'}
            className="inline-flex items-center justify-center rounded-xl bg-[var(--lagoon)] px-4 py-2 text-sm font-semibold text-white no-underline hover:opacity-90"
          >
            Ir al panel
          </Link>
        </div>
      </main>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await signUp(email.trim(), password, name.trim() || null)
      const redirectTo = search.redirect ?? '/'
      window.location.assign(redirectTo)
    } catch (err) {
      setError((err as Error).message || 'No se pudo crear la cuenta')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="page-wrap flex min-h-[70vh] items-center justify-center px-3 py-8 sm:px-4">
      <section className="island-shell w-full max-w-md rounded-2xl p-4 sm:p-8">
        <p className="island-kicker mb-2">Registro</p>
        <h1 className="display-title mb-3 text-2xl font-bold text-[var(--sea-ink)] sm:text-3xl">
          Crear cuenta
        </h1>
        <p className="mb-6 text-sm text-[var(--sea-ink-soft)]">
          Ingresa tu correo y una contraseña (mínimo 6 caracteres). Luego podrás iniciar sesión con los mismos datos.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--sea-ink-soft)]">
              Correo electrónico *
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
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--sea-ink-soft)]">
              Nombre (opcional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--sea-ink-soft)]">
              Contraseña *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--sea-ink-soft)]">
              Confirmar contraseña *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              placeholder="Repite la contraseña"
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
            {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-[var(--sea-ink-soft)]">
          ¿Ya tienes cuenta?{' '}
          <Link
            to="/signin"
            search={search.redirect ? { redirect: search.redirect } : undefined}
            className="font-semibold text-[var(--lagoon)] underline hover:no-underline"
          >
            Inicia sesión
          </Link>
        </p>
      </section>
    </main>
  )
}
