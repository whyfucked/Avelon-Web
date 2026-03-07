/**
 * VMManager Sync API
 * Синхронизация данных с VMManager6
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth-admin'
import { getVmManager } from '@/vm6/VmManager'

// POST - синхронизация с VMManager6
export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const vm = getVmManager()
    
    // Получаем данные из VMManager6
    const [nodes, clusters, osImages, hosts] = await Promise.all([
      vm.getNodes().catch(() => []),
      vm.getClusters().catch(() => []),
      vm.getOsImages().catch(() => []),
      vm.listVms().catch(() => [])
    ])

    return NextResponse.json({
      success: true,
      synced: {
        nodes: nodes.length,
        clusters: clusters.length,
        osImages: osImages.length,
        hosts: hosts.length
      },
      data: {
        nodes,
        clusters,
        osImages,
        hosts
      }
    })
  } catch (error) {
    console.error('[Admin VMManager] Sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
