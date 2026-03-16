import { createServerFn } from '@tanstack/react-start'
import crypto from 'node:crypto'
import { db } from './db'

export type AuthUser = {
  id: string
  email: string
  name: string | null
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const derived = crypto.scryptSync(password, salt, 64).toString('hex')
  const hashBuf = Buffer.from(hash, 'hex')
  const derivedBuf = Buffer.from(derived, 'hex')
  if (hashBuf.length !== derivedBuf.length) {
    return false
  }
  return crypto.timingSafeEqual(hashBuf, derivedBuf)
}

export const signIn = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async (ctx) => {
    const rawEmail = ctx.data.email?.trim()
    const rawPassword = ctx.data.password ?? ''
    if (!rawEmail) {
      throw new Error('Correo requerido')
    }
    if (!rawPassword) {
      throw new Error('Contraseña requerida')
    }

    const email = rawEmail.toLowerCase()
    const user = await db.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new Error('Usuario o contraseña incorrectos')
    }

    if (!user.passwordHash || !verifyPassword(rawPassword, user.passwordHash)) {
      throw new Error('Usuario o contraseña incorrectos')
    }

    const result: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
    }

    return result
  })

export const signUp = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { email: string; password: string; name?: string | null }) => data,
  )
  .handler(async (ctx) => {
    const rawEmail = ctx.data.email?.trim()
    const rawPassword = ctx.data.password ?? ''
    const name = ctx.data.name?.trim() || null

    if (!rawEmail) {
      throw new Error('Correo requerido')
    }
    if (!rawPassword) {
      throw new Error('Contraseña requerida')
    }
    if (rawPassword.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres')
    }

    const email = rawEmail.toLowerCase()
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      throw new Error('Ya existe una cuenta con este correo')
    }

    const passwordHash = hashPassword(rawPassword)
    const user = await db.user.create({
      data: { email, name, passwordHash },
    })

    const result: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
    }
    return result
  })

export const _devHashPassword = hashPassword

