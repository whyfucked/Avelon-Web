/**
 * VMManager Expired Rentals API
 * Обработка истёкших аренд
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth-admin'
import { getVmManager } from '@/vm6/VmManager'

// GET - получить истёкшие аренды
export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const vm = getVmManager()
    const expiredRentals = vm.getExpiredRentals()
    
    return NextResponse.json({
      rentals: expiredRentals,
      count: expiredRentals.length
    })
  } catch (error) {
    console.error('[Admin VMManager] Error fetching expired rentals:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch expired rentals' },
      { status: 500 }
    )
  }
}

// POST - обработать истёкшие аренды (приостановить серверы)
export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const vm = getVmManager()
    const expiredRentals = vm.getExpiredRentals()
    
    const results = {
      processed: 0,
      suspended: 0,
      errors: [] as string[]
    }

    for (const rental of expiredRentals) {
      try {
        if (rental.status === 'active') {
          await vm.suspendVm(rental.vmmanager6_host_id)
          results.suspended++
        }
        results.processed++
      } catch (error) {
        results.errors.push(`Host ${rental.vmmanager6_host_id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Обработано ${results.processed} аренд, приостановлено ${results.suspended} серверов`
    })
  } catch (error) {
    console.error('[Admin VMManager] Error processing expired rentals:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process expired rentals' },
      { status: 500 }
    )
  }
}
