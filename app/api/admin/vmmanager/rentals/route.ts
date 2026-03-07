/**
 * VMManager Rentals API
 * Управление арендами VDS серверов
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth-admin'
import { getVmManager } from '@/vm6/VmManager'
import { readDatabase } from '@/lib/local-db'
import { prisma } from '@/lib/db'

// GET - получить все аренды
export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const db = readDatabase()
    const rentals = db.vmmanager6_rentals || []
    
    // Получаем email пользователей
    const userIds = [...new Set(rentals.map((r: any) => r.user_id))]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true }
    })
    const userMap = new Map(users.map(u => [u.id, u.email]))
    
    // Добавляем email к каждой аренде
    const rentalsWithEmail = rentals.map((rental: any) => ({
      ...rental,
      user_email: userMap.get(rental.user_id) || rental.user_id
    }))
    
    return NextResponse.json(rentalsWithEmail)
  } catch (error) {
    console.error('[Admin VMManager] Error fetching rentals:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch rentals' },
      { status: 500 }
    )
  }
}

// POST - продлить аренду
export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { userId, hostId, days } = body

    if (!userId || !hostId || !days) {
      return NextResponse.json(
        { error: 'userId, hostId and days are required' },
        { status: 400 }
      )
    }

    const vm = getVmManager()
    const rental = vm.renewRental(userId, hostId, days)

    if (!rental) {
      return NextResponse.json(
        { error: 'Rental not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      rental,
      message: `Аренда продлена на ${days} дней`
    })
  } catch (error) {
    console.error('[Admin VMManager] Error renewing rental:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to renew rental' },
      { status: 500 }
    )
  }
}

// PATCH - обновить настройки аренды
export async function PATCH(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { userId, hostId, ...updates } = body

    if (!userId || !hostId) {
      return NextResponse.json(
        { error: 'userId and hostId are required' },
        { status: 400 }
      )
    }

    const vm = getVmManager()
    const rental = vm.updateRental(userId, hostId, updates)

    if (!rental) {
      return NextResponse.json(
        { error: 'Rental not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      rental
    })
  } catch (error) {
    console.error('[Admin VMManager] Error updating rental:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update rental' },
      { status: 500 }
    )
  }
}
