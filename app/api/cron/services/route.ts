import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Проверка истекших сервисов и установка grace period
export async function GET(req: NextRequest) {
  try {
    // Проверяем секретный ключ для cron
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const gracePeriodDays = 3 // 3 дня grace period
    const gracePeriodEnd = new Date(now)
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays)

    let suspended = 0
    let graceSet = 0

    // Обрабатываем дедики
    const expiredDedicated = await prisma.dedicatedServer.findMany({
      where: {
        expiresAt: { lte: now },
        status: { in: ['ACTIVE', 'GRACE_PERIOD'] },
      },
      include: { user: true, plan: true },
    })

    for (const server of expiredDedicated) {
      if (server.status === 'ACTIVE') {
        // Устанавливаем grace period
        await prisma.dedicatedServer.update({
          where: { id: server.id },
          data: {
            status: 'GRACE_PERIOD',
            gracePeriodEnd,
          },
        })
        graceSet++
        console.log(`[Cron] Dedicated ${server.name} moved to grace period`)
      } else if (server.status === 'GRACE_PERIOD' && server.gracePeriodEnd && new Date(server.gracePeriodEnd) <= now) {
        // Grace period истёк - приостанавливаем
        await prisma.dedicatedServer.update({
          where: { id: server.id },
          data: { status: 'SUSPENDED' },
        })
        suspended++
        console.log(`[Cron] Dedicated ${server.name} suspended after grace period`)
      }
    }

    // Обрабатываем домены
    const expiredDomains = await prisma.domain.findMany({
      where: {
        expiresAt: { lte: now },
        status: { in: ['ACTIVE', 'GRACE_PERIOD'] },
      },
      include: { user: true, plan: true },
    })

    for (const domain of expiredDomains) {
      if (domain.status === 'ACTIVE') {
        await prisma.domain.update({
          where: { id: domain.id },
          data: {
            status: 'GRACE_PERIOD',
            gracePeriodEnd,
          },
        })
        graceSet++
        console.log(`[Cron] Domain ${domain.name} moved to grace period`)
      } else if (domain.status === 'GRACE_PERIOD' && domain.gracePeriodEnd && new Date(domain.gracePeriodEnd) <= now) {
        await prisma.domain.update({
          where: { id: domain.id },
          data: { status: 'SUSPENDED' },
        })
        suspended++
        console.log(`[Cron] Domain ${domain.name} suspended after grace period`)
      }
    }

    // Обрабатываем StorageBox
    const expiredBoxes = await prisma.storageBox.findMany({
      where: {
        expiresAt: { lte: now },
        status: { in: ['ACTIVE', 'GRACE_PERIOD'] },
      },
      include: { user: true, plan: true },
    })

    for (const box of expiredBoxes) {
      if (box.status === 'ACTIVE') {
        await prisma.storageBox.update({
          where: { id: box.id },
          data: {
            status: 'GRACE_PERIOD',
            gracePeriodEnd,
          },
        })
        graceSet++
        console.log(`[Cron] StorageBox ${box.name} moved to grace period`)
      } else if (box.status === 'GRACE_PERIOD' && box.gracePeriodEnd && new Date(box.gracePeriodEnd) <= now) {
        await prisma.storageBox.update({
          where: { id: box.id },
          data: { status: 'SUSPENDED' },
        })
        suspended++
        console.log(`[Cron] StorageBox ${box.name} suspended after grace period`)
      }
    }

    // Обрабатываем VDS
    const expiredVds = await prisma.vdsServer.findMany({
      where: {
        expiresAt: { lte: now },
        status: { in: ['ACTIVE', 'GRACE_PERIOD'] },
      },
      include: { user: true, plan: true },
    })

    for (const vds of expiredVds) {
      if (vds.status === 'ACTIVE') {
        await prisma.vdsServer.update({
          where: { id: vds.id },
          data: {
            status: 'GRACE_PERIOD',
            gracePeriodEnd,
          },
        })
        graceSet++
        console.log(`[Cron] VDS ${vds.name} moved to grace period`)
      } else if (vds.status === 'GRACE_PERIOD' && vds.gracePeriodEnd && new Date(vds.gracePeriodEnd) <= now) {
        await prisma.vdsServer.update({
          where: { id: vds.id },
          data: { status: 'SUSPENDED' },
        })
        suspended++
        console.log(`[Cron] VDS ${vds.name} suspended after grace period`)
      }
    }

    return NextResponse.json({
      success: true,
      graceSet,
      suspended,
      message: `Grace period set for ${graceSet} services, ${suspended} services suspended`,
    })
  } catch (error) {
    console.error('[Cron Services]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
