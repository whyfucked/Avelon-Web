/**
 * VMManager Admin API
 * Управление VDS серверами через VMManager6
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth-admin'
import { getVmManager } from '@/vm6/VmManager'
import { prisma } from '@/lib/db'
import { deleteVMManager6ServerFromDatabase, getVMManager6RentalByHostId } from '@/vm6/vmmanager6-rentals'
import { sendVdsDeletedEmail } from '@/lib/email'

// GET - получить список всех VDS серверов
export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const vm = getVmManager()
    const hosts = await vm.listVms()
    
    // Получаем все аренды для обогащения данных
    const expiredRentals = vm.getExpiredRentals()
    
    // Добавляем email владельца к каждому хосту
    const hostsWithOwners = await Promise.all(
      hosts.map(async (host) => {
        const rental = getVMManager6RentalByHostId(host.id)
        let ownerEmail: string | null = null
        
        if (rental) {
          try {
            const user = await prisma.user.findUnique({
              where: { id: rental.user_id },
              select: { email: true }
            })
            ownerEmail = user?.email || null
          } catch {}
        }
        
        return {
          ...host,
          ownerEmail
        }
      })
    )
    
    return NextResponse.json({
      hosts: hostsWithOwners,
      expiredCount: expiredRentals.length,
      success: true
    })
  } catch (error) {
    console.error('[Admin VMManager] Error fetching hosts:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch VDS servers' },
      { status: 500 }
    )
  }
}

// POST - действия с серверами (start, stop, restart, suspend, resume, delete, ban)
export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { action, hostId, reason } = body

    if (!hostId) {
      return NextResponse.json({ error: 'Host ID required' }, { status: 400 })
    }

    const vm = getVmManager()

    switch (action) {
      case 'start':
        await vm.startVm(hostId)
        return NextResponse.json({ success: true, message: 'Сервер запущен' })

      case 'stop':
        await vm.stopVm(hostId)
        return NextResponse.json({ success: true, message: 'Сервер остановлен' })

      case 'restart':
        await vm.restartVm(hostId)
        return NextResponse.json({ success: true, message: 'Сервер перезапущен' })

      case 'suspend':
        await vm.suspendVm(hostId)
        return NextResponse.json({ success: true, message: 'Сервер приостановлен' })

      case 'resume':
        await vm.resumeVm(hostId)
        return NextResponse.json({ success: true, message: 'Сервер возобновлён' })

      case 'delete':
        // Получаем данные аренды для email
        const rental = getVMManager6RentalByHostId(hostId)
        let serverName = `VDS-${hostId}`
        let userEmail: string | null = null
        
        // Получаем имя сервера из VMManager
        try {
          const host = await vm.getVm(hostId)
          serverName = host?.name || serverName
        } catch {}
        
        // Получаем email пользователя
        if (rental) {
          const user = await prisma.user.findUnique({
            where: { id: rental.user_id },
            select: { email: true }
          })
          userEmail = user?.email || null
        }
        
        // Удаляем из VMManager
        await vm.deleteVm(hostId)
        // Удаляем из базы данных Prisma
        await prisma.vdsServer.deleteMany({
          where: { vmManagerId: hostId }
        })
        // Удаляем из локальной базы аренд
        deleteVMManager6ServerFromDatabase(hostId)
        
        // Отправляем email пользователю
        if (userEmail) {
          sendVdsDeletedEmail(userEmail, {
            serverName,
            reason: 'Удалён администратором'
          }).catch(err => console.error('[Admin VMManager] Email error:', err))
        }
        
        return NextResponse.json({ success: true, message: 'Сервер удалён' })

      case 'ban':
        if (!reason) {
          return NextResponse.json({ error: 'Ban reason required' }, { status: 400 })
        }
        await vm.banVm(hostId, reason)
        return NextResponse.json({ success: true, message: 'Сервер заблокирован' })

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[Admin VMManager] Action error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 }
    )
  }
}
