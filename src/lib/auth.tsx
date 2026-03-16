import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { signIn, signUp as signUpServer, type AuthUser } from '../server/auth'

const STORAGE_KEY = 'cartera:user'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<AuthUser | null>
  signUp: (email: string, password: string, name?: string | null) => Promise<AuthUser | null>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as AuthUser
        if (parsed && parsed.id && parsed.email) {
          setUser(parsed)
        }
      }
    } catch {
      // ignore corrupt storage
    } finally {
      setLoading(false)
    }
  }, [])

  const signInMutation = useMutation({
    mutationFn: async (vars: { email: string; password: string }) => {
      const result = await signIn({ data: { email: vars.email, password: vars.password } })
      return result
    },
    onSuccess: (result) => {
      if (result) {
        setUser(result)
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result))
        } catch {
          // ignore storage errors
        }
      }
    },
  })

  const handleSignIn = async (email: string, password: string) => {
    const result = await signInMutation.mutateAsync({ email, password })
    return result ?? null
  }

  const signUpMutation = useMutation({
    mutationFn: async (vars: { email: string; password: string; name?: string | null }) => {
      const result = await signUpServer({
        data: { email: vars.email, password: vars.password, name: vars.name ?? undefined },
      })
      return result
    },
    onSuccess: (result) => {
      if (result) {
        setUser(result)
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result))
        } catch {
          // ignore storage errors
        }
      }
    },
  })

  const handleSignUp = async (email: string, password: string, name?: string | null) => {
    const result = await signUpMutation.mutateAsync({ email, password, name })
    return result ?? null
  }

  const signOut = () => {
    setUser(null)
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    router.navigate({ to: '/signin' })
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: handleSignIn,
      signUp: handleSignUp,
      signOut,
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

