import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET - получить все сервисы пользователя
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    
    console.log('[User Services] Loading for user:', user.id, user.email)

    const [servers, vdsServers, dedicatedServers, domains, storageBoxes] = await Promise.all([
      prisma.server.findMany({
        where: { userId: user.id },
        include: {
          plan: true,
          node: true,
          egg: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vdsServer.findMany({
        where: { userId: user.id },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dedicatedServer.findMany({
        where: { userId: user.id },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.domain.findMany({
        where: { userId: user.id },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.storageBox.findMany({
        where: { userId: user.id },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    console.log('[User Services] Found:', {
      dedicated: dedicatedServers.length,
      domains: domains.length,
      storageBoxes: storageBoxes.length,
    })

    return NextResponse.json({
      minecraft: servers.filter(s => s.plan.category === 'MINECRAFT'),
      coding: servers.filter(s => s.plan.category === 'CODING'),
      vds: vdsServers,
      dedicated: dedicatedServers,
      domains,
      storageBoxes,
    })
  } catch (error) {
    console.error('[User Services GET]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
