/**
 * VMManager Nodes API
 * Управление нодами VMManager6
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth-admin'
import { getVmManager } from '@/vm6/VmManager'
import fs from 'fs'
import path from 'path'

// Функция для загрузки нод из конфигурационного файла
function loadNodesFromConfig() {
  try {
    const configPath = path.join(process.cwd(), 'data', 'vmmanager6-nodes.json')
    
    if (!fs.existsSync(configPath)) {
      console.log('[Admin VMManager] Config file not found, using hardcoded fallback')
      return getHardcodedNodes()
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
    
    console.log(`[Admin VMManager] Loaded ${vmNodes.length} nodes from config file`)
    return vmNodes
    
  } catch (error) {
    console.error('[Admin VMManager] Error reading config file:', error)
    return getHardcodedNodes()
  }
}

// Hardcoded fallback ноды
function getHardcodedNodes() {
  return [
    // DE-PROMO кластер
    {
      id: 1,
      name: 'Promo-1-R7-1700X-PRO',
      cluster: 11,
      is_active: true,
      state: 'active',
      host: 'promo-1-r7-1700x-pro.example.com',
      cpu_cores: 16,
      cpu_used: 11,
      ram_mib: 64000,
      ram_used_mib: 2176,
      disk_gib: 4300,
      disk_used_gib: 100,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    // DE-NODE кластер  
    {
      id: 2,
      name: 'DE-I5-1250',
      cluster: 10,
      is_active: true,
      state: 'active',
      host: 'de-i5-1250.example.com',
      cpu_cores: 8,
      cpu_used: 3,
      ram_mib: 64000,
      ram_used_mib: 8148,
      disk_gib: 435,
      disk_used_gib: 250,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    // RU-NODE кластер
    {
      id: 3,
      name: 'RU-NODE',
      cluster: 9,
      is_active: true,
      state: 'active',
      host: 'ru-node.example.com',
      cpu_cores: 10,
      cpu_used: 0,
      ram_mib: 31744,
      ram_used_mib: 60,
      disk_gib: 871,
      disk_used_gib: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ]
}

// GET - получить список нод
export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const vm = getVmManager()
    const nodes = await vm.getNodes()
    
    // Если получили ноды из VMManager6, возвращаем их
    if (nodes && nodes.length > 0) {
      console.log(`[Admin VMManager] Retrieved ${nodes.length} nodes from VMManager6`)
      return NextResponse.json(nodes)
    }
    
    // Fallback к конфигурационному файлу
    console.log('[Admin VMManager] VMManager6 returned no nodes, using config fallback')
    const configNodes = loadNodesFromConfig()
    return NextResponse.json(configNodes)
    
  } catch (error) {
    console.error('[Admin VMManager] Error fetching nodes from VMManager6:', error)
    
    // В случае ошибки также используем fallback
    console.log('[Admin VMManager] Using config fallback due to error')
    const configNodes = loadNodesFromConfig()
    return NextResponse.json(configNodes)
  }
}
