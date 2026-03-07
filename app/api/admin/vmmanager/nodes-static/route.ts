/**
 * VMManager Nodes API (Static/Fallback)
 * Альтернативный способ получения нод для админки
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth-admin'

// Статические данные нод (реальные ноды из VMManager6)
const STATIC_NODES = [
  // DE-PROMO кластер
  {
    id: 1,
    name: 'Promo-1-R7-1700X-PRO',
    cluster: 11, // DE-PROMO кластер
    is_active: true,
    state: 'active',
    host: 'promo-1-r7-1700x-pro.example.com',
    cpu_cores: 16,
    cpu_used: 11,
    ram_mib: 64000, // ~62.3GB
    ram_used_mib: 2176,
    disk_gib: 4300, // 4.3TB
    disk_used_gib: 100,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  // DE-NODE кластер  
  {
    id: 2,
    name: 'DE-I5-1250',
    cluster: 10, // DE-NODE кластер
    is_active: true,
    state: 'active',
    host: 'de-i5-1250.example.com',
    cpu_cores: 8,
    cpu_used: 3,
    ram_mib: 64000, // ~62.5GB
    ram_used_mib: 8148,
    disk_gib: 435, // 435.5GB
    disk_used_gib: 250,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  // RU-NODE кластер
  {
    id: 3,
    name: 'RU-NODE',
    cluster: 9, // RU-NODE кластер
    is_active: true,
    state: 'active',
    host: 'ru-node.example.com',
    cpu_cores: 10,
    cpu_used: 0,
    ram_mib: 31744, // ~31GB
    ram_used_mib: 60,
    disk_gib: 871, // 871.4GB
    disk_used_gib: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

// GET - получить список нод (статические данные)
export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    console.log('[Admin VMManager] Returning static nodes data')
    return NextResponse.json(STATIC_NODES)
  } catch (error) {
    console.error('[Admin VMManager] Error fetching static nodes:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch nodes' },
      { status: 500 }
    )
  }
}