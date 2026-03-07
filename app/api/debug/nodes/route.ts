import { NextRequest, NextResponse } from "next/server"
import { getNodeSelectionService } from "@/lib/node-selection"
import { getVMManager6API } from "@/vm6/vmmanager6"

export async function GET(request: NextRequest) {
  try {
    console.log('[Debug] Starting node diagnostics...')
    
    const vmAPI = getVMManager6API()
    const nodeService = getNodeSelectionService()
    
    // Test health check
    const healthCheck = await vmAPI.healthCheck()
    console.log('[Debug] Health check:', healthCheck)
    
    // Get nodes
    const nodes = await vmAPI.getNodes()
    console.log('[Debug] Found nodes:', nodes.length)
    
    // Get clusters
    const clusters = await vmAPI.getClusters()
    console.log('[Debug] Found clusters:', clusters.length)
    
    // Test node selection for cluster 9
    let nodeSelectionResult = null
    let nodeSelectionError = null
    
    try {
      nodeSelectionResult = await nodeService.selectNode({
        clusterId: 9,
        strategy: 'auto',
        requireActiveOnly: true
      })
    } catch (error) {
      nodeSelectionError = error instanceof Error ? error.message : String(error)
    }
    
    // Get IP pools for cluster 9
    let ipPools: any[] = []
    try {
      ipPools = await vmAPI.getClusterIPPools(9)
    } catch (error) {
      console.error('[Debug] IP pools error:', error)
    }
    
    return NextResponse.json({
      success: true,
      diagnostics: {
        health: healthCheck,
        nodes: nodes.map(node => ({
          id: node.id,
          name: node.name,
          state: node.state,
          is_active: node.is_active,
          cluster: node.cluster
        })),
        clusters: clusters.map(cluster => ({
          id: cluster.id,
          name: cluster.name,
          nodes: cluster.nodes
        })),
        cluster9_ip_pools: ipPools.map(pool => ({
          id: pool.id,
          name: pool.name,
          cluster: pool.cluster
        })),
        node_selection: {
          result: nodeSelectionResult,
          error: nodeSelectionError
        }
      }
    })
    
  } catch (error) {
    console.error('[Debug] Diagnostics failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}