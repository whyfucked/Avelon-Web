/**
 * VMManager6 Health Check API
 * Проверка доступности VMManager6
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth-admin'
import { getVmManager } from '@/vm6/VmManager'

// GET - проверить здоровье VMManager6
export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const vm = getVmManager()
    const health = await vm.healthCheck()
    
    return NextResponse.json({
      ...health,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[VMManager Health] Error:', error)
    return NextResponse.json({
      ok: false,
      latency: 0,
      error: error instanceof Error ? error.message : 'Health check failed',
      timestamp: new Date().toISOString()
    })
  }
}
