/**
 * User VDS Server Details & Actions API
 * Получение деталей и управление конкретным VDS сервером
 */

import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { getVMManager6API } from '@/vm6/vmmanager6'
import { getVMManager6RentalByServerId, suspendVMManager6ServerInDatabase, deleteVMManager6ServerFromDatabase, getVMManager6Rentals } from '@/vm6/vmmanager6-rentals'
import { prisma } from '@/lib/db'
import { sendVdsDeletedEmail } from '@/lib/email'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const VMMANAGER_PANEL_URL = process.env.VMMANAGER6_PANEL_URL || 'https://vmmanager.space'

interface AuthPayload {
  userId: string
  email: string
  role: string
}

function getAuthFromRequest(request: NextRequest): AuthPayload | null {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return null
    return jwt.verify(token, JWT_SECRET) as AuthPayload
  } catch {
    return null
  }
}

// GET - получить детальную информацию о VDS
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const hostId = parseInt(id)
  
  if (isNaN(hostId)) {
    return NextResponse.json({ error: 'Invalid server ID' }, { status: 400 })
  }

  try {
    const rental = getVMManager6RentalByServerId(auth.userId, `vmmanager6_${hostId}`)
    if (!rental) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    if (rental.status === 'banned') {
      return NextResponse.json({
        error: 'Услуга заблокирована администратором',
        ban_reason: 'Услуга заблокирована',
        banned: true
      }, { status: 403 })
    }

    const vmAPI = getVMManager6API()
    
    let host
    try {
      host = await vmAPI.getVm(hostId)
      console.log('[VDS Details] Got host data:', { id: host.id, state: host.state, ip: host.ip })
    } catch (error) {
      console.error('[VDS Details] Failed to get host from VMManager6:', error)
      return NextResponse.json({
        server: {
          id: rental.id,
          vmmanager6_host_id: hostId,
          name: `VDS-${hostId}`,
          status: rental.status,
          ip_addresses: [],
          ip_address: null,
          osName: 'Unknown',
          ram: 0,
          cpu: 0,
          disk: 0,
          planName: rental.plan_name,
          price: rental.rental_price,
          expiresAt: rental.expires_at,
          autoRenew: rental.auto_renew,
        },
        panelUrl: `${VMMANAGER_PANEL_URL}/vm/host/${hostId}`,
        error: 'VMManager6 API unavailable'
      })
    }

    const osId = typeof host.os === 'object' ? host.os.id : host.os
    let osName = `OS #${osId}`
    try {
      const osImage = await prisma.vdsOsImage.findFirst({
        where: { vmManagerId: osId },
        select: { name: true }
      })
      if (osImage) osName = osImage.name
    } catch (e) {
      console.error('[VDS Details] Failed to get OS name:', e)
    }

    // IP адреса
    const ipAddresses = host.ip?.map(ip => ip.name) || []

    // Вычисляем время до истечения
    const now = new Date()
    const expiresAt = new Date(rental.expires_at)
    const timeUntilExpiry = expiresAt.getTime() - now.getTime()
    const daysUntilExpiry = Math.ceil(timeUntilExpiry / (1000 * 60 * 60 * 24))

    // Извлекаем числовые значения для диска
    let diskValue = 0
    if (typeof host.disk === 'object' && host.disk) {
      diskValue = (host.disk as any).disk_mib || (host.disk as any).size_mib || 0
    } else if (host.disk_info) {
      diskValue = host.disk_info.disk_mib || host.disk_info.size_mib || 0
    } else if (host.disk_mib) {
      diskValue = host.disk_mib
    } else if (typeof host.disk === 'number' && host.disk > 0) {
      diskValue = host.disk
    }
    
    // Если диск не получен - пробуем отдельный запрос
    if (diskValue === 0) {
      try {
        const disks = await vmAPI.getVmDisks(hostId)
        if (disks && disks.length > 0) {
          // Суммируем все диски
          diskValue = disks.reduce((sum, disk) => sum + (disk.disk_mib || disk.size_mib || 0), 0)
        }
      } catch (e: any) {
        // Игнорируем ошибку 403 - нет прав на получение дисков
        if (e?.code !== 403) {
          console.error('[VDS Details] Failed to get disks:', e)
        }
      }
    }

    return NextResponse.json({
      server: {
        id: rental.id,
        vmmanager6_host_id: hostId,
        name: host.name || `VDS-${hostId}`,
        status: host.state || 'unknown',
        ip_addresses: ipAddresses,
        ip_address: ipAddresses[0] || null,
        os: osId,
        osName,
        // Характеристики (VMManager6 хранит в MiB)
        ram: host.ram ? Math.round(host.ram / 1024) : 0,
        cpu: host.cpu || 0,
        disk: diskValue ? Math.round(diskValue / 1024) : 0,
        // Аренда
        planName: rental.plan_name,
        price: rental.rental_price,
        expiresAt: rental.expires_at,
        autoRenew: rental.auto_renew,
        rentalStatus: rental.status,
        // Дополнительные данные из VMManager6
        node: host.node,
        cluster: host.cluster,
        bandwidth: host.bandwidth,
        rescue_mode: host.rescue_mode,
        created_at: host.created_at,
      },
      expiryInfo: {
        expires_at: rental.expires_at,
        days_until_expiry: daysUntilExpiry,
        is_expired: timeUntilExpiry <= 0,
        is_expiring_soon: daysUntilExpiry <= 7 && daysUntilExpiry > 0,
      },
      panelUrl: `${VMMANAGER_PANEL_URL}/vm/host/${hostId}`,
    })
  } catch (error) {
    console.error('[VDS Details] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch server details' },
      { status: 500 }
    )
  }
}

// POST - действия с сервером (start, stop, restart)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const hostId = parseInt(id)
  
  if (isNaN(hostId)) {
    return NextResponse.json({ error: 'Invalid server ID' }, { status: 400 })
  }

  try {
    // Проверяем что сервер принадлежит пользователю
    const rental = getVMManager6RentalByServerId(auth.userId, `vmmanager6_${hostId}`)
    if (!rental) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    if (rental.status !== 'active') {
      return NextResponse.json(
        { error: 'Сервер приостановлен. Продлите подписку.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action } = body

    const vmAPI = getVMManager6API()

    switch (action) {
      case 'start':
        await vmAPI.startVm(hostId)
        return NextResponse.json({ success: true, message: 'Сервер запускается' })

      case 'stop':
        await vmAPI.stopVm(hostId)
        return NextResponse.json({ success: true, message: 'Сервер останавливается' })

      case 'restart':
        await vmAPI.restartVm(hostId)
        return NextResponse.json({ success: true, message: 'Сервер перезапускается' })

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[VDS Action] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 }
    )
  }
}


// DELETE - удалить VDS сервер
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const hostId = parseInt(id)
  
  if (isNaN(hostId)) {
    return NextResponse.json({ error: 'Invalid server ID' }, { status: 400 })
  }

  try {
    // Проверяем что сервер принадлежит пользователю
    const rentals = getVMManager6Rentals(auth.userId)
    const rental = rentals.find(r => r.vmmanager6_host_id === hostId)
    
    if (!rental) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    const vmAPI = getVMManager6API()
    
    let serverName = `VDS-${hostId}`
    try {
      const host = await vmAPI.getVm(hostId)
      serverName = host.name || serverName
    } catch {}

    let refundAmount = 0
    const now = new Date()
    const expiresAt = new Date(rental.expires_at)
    const createdAt = new Date(rental.created_at)
    
    if (expiresAt > now && rental.rental_price > 0) {
      const totalDays = Math.ceil((expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      const remainingDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      refundAmount = Math.floor((remainingDays / totalDays) * rental.rental_price)
    }

    try {
      await vmAPI.deleteVm(hostId)
    } catch (e: any) {
      if (!e.message?.includes('Host id unknown') && !e.message?.includes('5021')) {
        console.error('[VDS Delete] VMManager6 error:', e)
      }
    }

    deleteVMManager6ServerFromDatabase(hostId)

    if (refundAmount > 0) {
      await prisma.user.update({
        where: { id: auth.userId },
        data: { balance: { increment: refundAmount } }
      })

      await prisma.transaction.create({
        data: {
          userId: auth.userId,
          amount: refundAmount,
          type: 'REFUND',
          description: `Возврат за VDS: ${serverName}`,
          status: 'COMPLETED'
        }
      })
    }

    sendVdsDeletedEmail(auth.email, {
      serverName,
      reason: 'По запросу пользователя',
      refundAmount: refundAmount > 0 ? refundAmount : undefined
    }).catch(err => console.error('[VDS Delete] Email error:', err))

    return NextResponse.json({ 
      success: true, 
      message: 'VDS сервер удалён',
      refund: refundAmount > 0 ? refundAmount : undefined
    })
  } catch (error) {
    console.error('[VDS Delete] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete server' },
      { status: 500 }
    )
  }
}
