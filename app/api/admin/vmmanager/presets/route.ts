/**
 * VMManager Presets API
 * Управление пресетами (конфигурациями VM) для VDS планов
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth-admin'
import { getVmManager } from '@/vm6/VmManager'

// GET - получить список пресетов из VMManager6
export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const vm = getVmManager()
    const presets = await vm.getPresets()
    
    return NextResponse.json(presets)
  } catch (error) {
    console.error('[Admin VMManager] Error fetching presets:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch presets' },
      { status: 500 }
    )
  }
}
