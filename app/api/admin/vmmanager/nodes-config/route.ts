/**
 * VMManager Nodes Config API
 * Получение нод из конфигурационного файла
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth-admin'
import fs from 'fs'
import path from 'path'

// GET - получить ноды из конфигурационного файла
export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const configPath = path.join(process.cwd(), 'data', 'vmmanager6-nodes.json')
    
    if (!fs.existsSync(configPath)) {
      return NextResponse.json({
        success: false,
        error: 'Configuration file not found'
      }, { status: 404 })
    }
    
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    const nodes = configData.nodes || []
    
    // Преобразуем в формат VMManager6Node
    const vmNodes = nodes.map((node: any) => ({
      id: node.id,
      name: node.name,
      cluster: node.cluster,
      is_active: node.is_active,
      state: node.state,
      host: node.host,
      cpu_cores: node.specs?.cpu_cores || 16,
      cpu_used: node.specs?.cpu_used || 0,
      ram_mib: Math.round((node.specs?.ram_gb || 32) * 1024),
      ram_used_mib: Math.round((node.specs?.ram_used_gb || 0) * 1024),
      disk_gib: node.specs?.disk_gb || 1000,
      disk_used_gib: node.specs?.disk_used_gb || 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: configData.last_updated || '2024-01-01T00:00:00Z'
    }))
    
    console.log(`[Config Nodes] Loaded ${vmNodes.length} nodes from config file`)
    
    return NextResponse.json(vmNodes)
    
  } catch (error) {
    console.error('[Config Nodes] Error reading config file:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read config'
    }, { status: 500 })
  }
}