import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth-admin'

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    await prisma.uptimeHistory.deleteMany({})
    await prisma.serviceStatus.deleteMany({})

    await prisma.serviceStatus.create({
      data: {
        name: 'WEB',
        type: 'WEB',
        isSystem: true,
        url: process.env.NEXT_PUBLIC_APP_URL || null,
        sortOrder: 0,
      },
    })

    await prisma.serviceStatus.create({
      data: {
        name: 'Pterodactyl Panel',
        type: 'GAME',
        isSystem: true,
        sortOrder: 1,
      },
    })

    const nodes = await prisma.pterodactylNode.findMany({
      where: { isActive: true },
    })

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      await prisma.serviceStatus.create({
        data: {
          name: node.name,
          type: 'NODE',
          isSystem: false,
          nodeId: node.id,
          sortOrder: 10 + i,
        },
      })
    }

    const statuses = await prisma.serviceStatus.findMany({
      include: { node: true },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({ 
      success: true, 
      count: statuses.length,
      statuses 
    })
  } catch (error) {
    console.error('Sync status error:', error)
    return NextResponse.json({ error: 'Failed to sync statuses' }, { status: 500 })
  }
}
