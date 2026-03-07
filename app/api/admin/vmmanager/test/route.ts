/**
 * VMManager Test Connection API
 * Проверка подключения к VMManager6
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth-admin'
import { getVmManager } from '@/vm6/VmManager'

// GET - проверка подключения
export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const vm = getVmManager()
    
    // Пробуем получить список нод как тест подключения
    const nodes = await vm.getNodes()
    
    return NextResponse.json({
      connected: true,
      nodesCount: nodes.length,
      message: 'VMManager6 подключён успешно'
    })
  } catch (error) {
    console.error('[Admin VMManager] Connection test failed:', error)
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    })
  }
}
