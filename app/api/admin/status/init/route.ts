import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth-admin'

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const existingWeb = await prisma.serviceStatus.findFirst({
      where: { type: 'WEB', isSystem: true },
    })

    if (!existingWeb) {
      await prisma.serviceStatus.create({
        data: {
          name: 'WEB',
          type: 'WEB',
          isSystem: true,
          url: process.env.NEXT_PUBLIC_APP_URL || null,
          sortOrder: 0,
        },
      })
    }

    const existingGame = await prisma.serviceStatus.findFirst({
      where: { type: 'GAME', isSystem: true },
    })

    if (!existingGame) {
      await prisma.serviceStatus.create({
        data: {
          name: 'Pterodactyl Panel',
          type: 'GAME',
          isSystem: true,
          sortOrder: 1,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Init status error:', error)
    return NextResponse.json({ error: 'Failed to init statuses' }, { status: 500 })
  }
}
