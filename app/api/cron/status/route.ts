import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { testConnection } from '@/lib/pterodactyl'

async function checkWebStatus(url: string): Promise<{ isOnline: boolean; responseTime: number | null }> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    })
    
    clearTimeout(timeout)
    const responseTime = Date.now() - start
    
    return {
      isOnline: response.ok || response.status < 500,
      responseTime,
    }
  } catch {
    return { isOnline: false, responseTime: null }
  }
}

async function checkPterodactylStatus(): Promise<{ isOnline: boolean; responseTime: number | null }> {
  const start = Date.now()
  try {
    const result = await testConnection()
    const responseTime = Date.now() - start
    return {
      isOnline: result.connected,
      responseTime,
    }
  } catch {
    return { isOnline: false, responseTime: null }
  }
}

async function checkNodeStatus(fqdn: string | null): Promise<{ isOnline: boolean; responseTime: number | null }> {
  if (!fqdn) return { isOnline: false, responseTime: null }
  
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    
    await fetch(`https://${fqdn}:8080`, {
      method: 'GET',
      signal: controller.signal,
    })
    
    clearTimeout(timeout)
    const responseTime = Date.now() - start
    
    return { isOnline: true, responseTime }
  } catch (error: any) {
    const responseTime = Date.now() - start
    if (error?.cause?.code === 'ECONNREFUSED' || error?.name === 'AbortError') {
      return { isOnline: false, responseTime: null }
    }
    if (responseTime < 5000) {
      return { isOnline: true, responseTime }
    }
    return { isOnline: false, responseTime: null }
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const statuses = await prisma.serviceStatus.findMany({
      include: { node: true },
    })

    for (const status of statuses) {
      let checkResult: { isOnline: boolean; responseTime: number | null }

      if (status.type === 'WEB') {
        if (status.url) {
          checkResult = await checkWebStatus(status.url)
        } else {
          checkResult = await checkWebStatus(process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.ru')
        }
      } else if (status.type === 'GAME') {
        checkResult = await checkPterodactylStatus()
      } else if (status.type === 'NODE' && status.node) {
        checkResult = await checkNodeStatus(status.node.fqdn)
      } else {
        checkResult = { isOnline: false, responseTime: null }
      }

      await prisma.serviceStatus.update({
        where: { id: status.id },
        data: {
          isOnline: checkResult.isOnline,
          responseTime: checkResult.responseTime,
          lastCheck: new Date(),
        },
      })

      await prisma.uptimeHistory.create({
        data: {
          serviceId: status.id,
          isOnline: checkResult.isOnline,
          responseTime: checkResult.responseTime,
        },
      })
    }

    const oldHistory = new Date()
    oldHistory.setDate(oldHistory.getDate() - 30)
    await prisma.uptimeHistory.deleteMany({
      where: { checkedAt: { lt: oldHistory } },
    })

    return NextResponse.json({ success: true, checked: statuses.length })
  } catch (error) {
    console.error('Cron status check error:', error)
    return NextResponse.json({ error: 'Failed to check statuses' }, { status: 500 })
  }
}
