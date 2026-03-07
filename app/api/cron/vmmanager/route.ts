/**
 * VMManager6 Cron API
 * Проверка истёкших VDS и их удаление/приостановка
 * Запускать каждый час через внешний cron или Vercel Cron
 */

import { NextRequest, NextResponse } from 'next/server'
import { getVMManager6API } from '@/vm6/vmmanager6'
import { 
  getExpiredVMManager6Rentals,
  suspendVMManager6ServerInDatabase,
  deleteVMManager6ServerFromDatabase
} from '@/vm6/vmmanager6-rentals'

// Секретный ключ для защиты cron endpoint
const CRON_SECRET = process.env.CRON_SECRET || 'your-cron-secret'

export async function GET(request: NextRequest) {
  // Проверяем авторизацию
  const authHeader = request.headers.get('authorization')
  const cronSecret = request.nextUrl.searchParams.get('secret')
  
  if (authHeader !== `Bearer ${CRON_SECRET}` && cronSecret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const vmAPI = getVMManager6API()
    const expiredRentals = getExpiredVMManager6Rentals()
    
    console.log(`[VMManager Cron] Found ${expiredRentals.length} expired rentals`)
    
    const results = {
      checked: expiredRentals.length,
      suspended: 0,
      deleted: 0,
      errors: [] as string[]
    }

    for (const rental of expiredRentals) {
      try {
        const now = new Date()
        const expiresAt = new Date(rental.expires_at)
        const daysSinceExpiry = Math.floor((now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60 * 24))
        
        console.log(`[VMManager Cron] Processing rental ${rental.id}, host ${rental.vmmanager6_host_id}, expired ${daysSinceExpiry} days ago`)
        
        if (daysSinceExpiry >= 3) {
          // Истекло более 3 дней назад - удаляем VM
          console.log(`[VMManager Cron] Deleting VM ${rental.vmmanager6_host_id} (expired ${daysSinceExpiry} days ago)`)
          
          try {
            await vmAPI.deleteVm(rental.vmmanager6_host_id)
          } catch (e: any) {
            // Если VM уже удалена - это нормально
            if (!e.message?.includes('Host id unknown') && !e.message?.includes('5021')) {
              throw e
            }
          }
          
          deleteVMManager6ServerFromDatabase(rental.vmmanager6_host_id)
          results.deleted++
          
        } else {
          // Истекло менее 3 дней назад - приостанавливаем VM
          console.log(`[VMManager Cron] Suspending VM ${rental.vmmanager6_host_id} (expired ${daysSinceExpiry} days ago)`)
          
          try {
            await vmAPI.stopVm(rental.vmmanager6_host_id)
          } catch (e: any) {
            // Если VM уже остановлена или удалена - это нормально
            if (!e.message?.includes('Host id unknown') && !e.message?.includes('5021')) {
              console.warn(`[VMManager Cron] Could not stop VM ${rental.vmmanager6_host_id}:`, e.message)
            }
          }
          
          suspendVMManager6ServerInDatabase(rental.vmmanager6_host_id)
          results.suspended++
        }
        
      } catch (error: any) {
        console.error(`[VMManager Cron] Error processing rental ${rental.id}:`, error)
        results.errors.push(`Rental ${rental.id}: ${error.message}`)
      }
    }

    console.log(`[VMManager Cron] Completed: suspended=${results.suspended}, deleted=${results.deleted}, errors=${results.errors.length}`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    })
    
  } catch (error) {
    console.error('[VMManager Cron] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron job failed' },
      { status: 500 }
    )
  }
}

// POST для ручного запуска
export async function POST(request: NextRequest) {
  return GET(request)
}
