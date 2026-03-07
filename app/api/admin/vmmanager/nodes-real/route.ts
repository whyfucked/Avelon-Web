/**
 * VMManager Real Nodes API
 * Получение реальных нод из VMManager6 с подробным логированием
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth-admin'
import { getVMManager6API } from '@/vm6/vmmanager6'

// GET - получить реальные ноды из VMManager6 с логированием
export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    console.log('[Real Nodes] Attempting to get real nodes from VMManager6...')
    
    const vmAPI = getVMManager6API()
    
    // Проверяем подключение
    console.log('[Real Nodes] Testing health check...')
    const health = await vmAPI.healthCheck()
    console.log('[Real Nodes] Health check result:', health)
    
    // Получаем ноды
    console.log('[Real Nodes] Getting nodes...')
    const nodes = await vmAPI.getNodes()
    console.log('[Real Nodes] Raw nodes response:', JSON.stringify(nodes, null, 2))
    
    // Получаем кластеры
    console.log('[Real Nodes] Getting clusters...')
    const clusters = await vmAPI.getClusters()
    console.log('[Real Nodes] Raw clusters response:', JSON.stringify(clusters, null, 2))
    
    // Анализируем данные
    const analysis = {
      nodes_count: nodes.length,
      clusters_count: clusters.length,
      nodes_by_cluster: {} as Record<number, any[]>,
      cluster_names: {} as Record<number, string>
    }
    
    // Группируем ноды по кластерам
    clusters.forEach(cluster => {
      analysis.cluster_names[cluster.id] = cluster.name
      analysis.nodes_by_cluster[cluster.id] = []
    })
    
    nodes.forEach(node => {
      if (node.cluster !== null && node.cluster !== undefined) {
        if (!analysis.nodes_by_cluster[node.cluster]) {
          analysis.nodes_by_cluster[node.cluster] = []
        }
        analysis.nodes_by_cluster[node.cluster].push({
          id: node.id,
          name: node.name,
          is_active: node.is_active,
          state: node.state
        })
      }
    })
    
    console.log('[Real Nodes] Analysis:', JSON.stringify(analysis, null, 2))
    
    return NextResponse.json({
      success: true,
      health_check: health,
      raw_data: {
        nodes,
        clusters
      },
      analysis,
      recommendations: {
        fallback_nodes: nodes.map((node, index) => ({
          id: index + 1,
          name: node.name,
          cluster: node.cluster,
          is_active: node.is_active,
          state: node.state || 'active',
          host: `${node.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.example.com`,
          cpu_cores: 16,
          cpu_used: 4,
          ram_mib: 32768,
          ram_used_mib: 8192,
          disk_gib: 1000,
          disk_used_gib: 250,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }))
      }
    })
    
  } catch (error) {
    console.error('[Real Nodes] Error getting real nodes:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}