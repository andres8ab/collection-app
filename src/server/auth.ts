import { createServerFn } from '@tanstack/react-start'
import { db } from './db'

export type AuthUser = {
  id: string
  email: string
  name: string | null
}

export const signIn = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string }) => data)
  .handler(async (ctx) => {
    const rawEmail = ctx.data.email?.trim()
    if (!rawEmail) {
      throw new Error('Correo requerido')
    }

    const email = rawEmail.toLowerCase()
    const user = await db.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new Error('Usuario no encontrado')
    }

    const result: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
    }

    return result
  })

