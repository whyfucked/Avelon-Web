import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from './db'

// JWT_SECRET проверяется при использовании, не при импорте
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }
  return secret
}

export interface AuthUser {
  id: string
  email: string
  role: 'USER' | 'ADMIN'
}

export async function isAuthEnabled(): Promise<boolean> {
  try {
    const setting = await prisma.adminSettings.findUnique({
      where: { key: 'authEnabled' },
    })
    if (!setting) return true
    return setting.value !== 'false'
  } catch {
    return true
  }
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    const enabled = await isAuthEnabled()
    if (!enabled) {
      return {
        id: 'public',
        email: 'public@avelon.local',
        role: 'USER',
      }
    }

    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return null
    }

    const decoded = jwt.verify(token, getJwtSecret()) as unknown as { userId: string; email: string; role: string }

    return {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role as 'USER' | 'ADMIN',
    }
  } catch {
    return null
  }
}

export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(request)
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireAdmin(request: NextRequest): Promise<AuthUser> {
  const user = await requireAuth(request)
  if (user.role !== 'ADMIN') {
    throw new Error('Forbidden')
  }
  return user
}

export async function getUserWithBalance(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      balance: true,
      role: true,
      pterodactylId: true,
    },
  })
}
