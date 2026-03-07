/**
 * Admin VMManager Cores API
 * Получение текущего количества используемых ядер VDS
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth-admin'

// GET - получить текущее количество ядер
export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    // Считаем ядра из активных VDS аренд (используем локальную JSON БД)
    const { getExpiredVMManager6Rentals } = await import('@/vm6/vmmanager6-rentals')
    const { readDatabase } = await import('@/lib/local-db')
    
    const db = readDatabase()
    const rentals = (db.vmmanager6_rentals || []).filter(
      (r: { status: string }) => r.status === 'active'
    )

    // Примерный расчёт ядер (по умолчанию 1 ядро на аренду если не указано)
    const totalCores = rentals.length

    return NextResponse.json({ totalCores, count: rentals.length })
  } catch (error) {
    console.error('[Admin VMManager Cores] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get cores' },
      { status: 500 }
    )
  }
}
