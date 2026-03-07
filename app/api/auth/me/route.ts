import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAuthEnabled } from '@/lib/auth'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function GET(request: NextRequest) {
  try {
    const enabled = await isAuthEnabled()
    
    if (!enabled) {
      return NextResponse.json({
        user: {
          id: 'public',
          email: 'public@avelon.local',
          name: 'Гость',
          balance: 0,
          role: 'USER',
          pterodactylId: null,
          emailVerified: true,
          createdAt: new Date().toISOString(),
        },
      })
    }

    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        balance: true,
        role: true,
        pterodactylId: true,
        emailVerified: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
