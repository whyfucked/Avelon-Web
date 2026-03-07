/**
 * Intelligent Node Selection Service
 * 
 * Provides smart node selection based on cluster compatibility,
 * load balancing algorithms, node health checking, and cluster-node validation.
 */

import { getVMManager6API } from './vmmanager6'
import { prisma } from './db'

// ============================================================================
// Types
// ============================================================================

export interface NodeInfo {
  id: number
  name: string
  state: string
  is_active: boolean
  cluster?: number
  load?: number
  health_score?: number
  last_check?: Date
}

export interface ClusterInfo {
  id: number
  name: string
  nodes: number[]
  ip_pools: number[]
  is_active: boolean
  country_code?: string
}

export interface NodeSelectionOptions {
  clusterId?: number
  strategy?: 'specific' | 'load-balanced' | 'auto' | 'health-based'
  specificNodeId?: number
  excludeNodes?: number[]
  requireActiveOnly?: boolean
  preferredCountry?: string
}

export interface NodeSelectionResult {
  nodeId: number
  clusterId: number
  validIpPools: number[]
  selectionReason: string
  healthScore?: number
  loadScore?: number
}

export interface NodeHealthMetrics {
  nodeId: number
  isOnline: boolean
  cpuUsage?: number
  memoryUsage?: number
  diskUsage?: number
  networkLatency?: number
  activeVms?: number
  maxVms?: number
  lastCheck: Date
  healthScore: number // 0-100
}

// ============================================================================
// Node Selection Service
// ============================================================================

export class NodeSelectionService {
  private vmAPI = getVMManager6API()
  private nodeHealthCache = new Map<number, NodeHealthMetrics>()
  private clusterCache = new Map<number, ClusterInfo>()
  private cacheExpiry = 5 * 60 * 1000 // 5 minutes

  /**
   * Select the best node for VDS creation
   */
  async selectNode(options: NodeSelectionOptions = {}): Promise<NodeSelectionResult> {
    console.log('[NodeSelection] Starting node selection with options:', options)

    // Get available nodes and clusters
    const [nodes, clusters] = await Promise.all([
      this.getAvailableNodes(),
      this.getAvailableClusters()
    ])

    console.log('[NodeSelection] Available nodes:', nodes.length)
    console.log('[NodeSelection] Available clusters:', clusters.length)

    if (options.clusterId) {
      const cluster = clusters.find(c => c.id === options.clusterId)
      if (!cluster) {
        throw new Error(`Cluster ${options.clusterId} not found`)
      }
      if (!cluster.is_active) {
        throw new Error(`Cluster ${options.clusterId} is not active`)
      }
    }

    // Apply selection strategy
    switch (options.strategy) {
      case 'specific':
        return this.selectSpecificNode(options, nodes, clusters)
      case 'load-balanced':
        return this.selectLoadBalancedNode(options, nodes, clusters)
      case 'health-based':
        return this.selectHealthBasedNode(options, nodes, clusters)
      case 'auto':
      default:
        return this.selectAutoNode(options, nodes, clusters)
    }
  }

  /**
   * Validate node-cluster compatibility
   */
  async validateNodeClusterCompatibility(nodeId: number, clusterId: number): Promise<boolean> {
    try {
      const clusters = await this.getAvailableClusters()
      const cluster = clusters.find(c => c.id === clusterId)
      
      if (!cluster) {
        console.error(`[NodeSelection] Cluster ${clusterId} not found`)
        return false
      }

      const isCompatible = cluster.nodes.includes(nodeId)
      console.log(`[NodeSelection] Node ${nodeId} compatibility with cluster ${clusterId}: ${isCompatible}`)
      
      if (!isCompatible) {
        console.warn(`[NodeSelection] Node ${nodeId} is not part of cluster ${clusterId}`)
        console.warn(`[NodeSelection] Cluster ${clusterId} nodes:`, cluster.nodes)
      }

      return isCompatible
    } catch (error) {
      console.error(`[NodeSelection] Error validating compatibility:`, error)
      return false
    }
  }

  /**
   * Get valid IP pools for a cluster
   */
  async getValidIpPoolsForCluster(clusterId: number): Promise<number[]> {
    try {
      const clusterPools = await this.vmAPI.getClusterIPPools(clusterId)
      const poolIds = clusterPools.map(pool => pool.id)
      
      console.log(`[NodeSelection] Valid IP pools for cluster ${clusterId}:`, poolIds)
      return poolIds
    } catch (error) {
      console.error(`[NodeSelection] Error getting IP pools for cluster ${clusterId}:`, error)
      return []
    }
  }

  /**
   * Check node health and get metrics
   */
  async checkNodeHealth(nodeId: number): Promise<NodeHealthMetrics> {
    // Check cache first
    const cached = this.nodeHealthCache.get(nodeId)
    if (cached && (Date.now() - cached.lastCheck.getTime()) < this.cacheExpiry) {
      return cached
    }

    try {
      // Get node info from VMManager6
      const nodes = await this.vmAPI.getNodes()
      const node = nodes.find(n => n.id === nodeId)
      
      if (!node) {
        throw new Error(`Node ${nodeId} not found`)
      }

      // Calculate health score based on available data
      let healthScore = 0
      let isOnline = false

      console.log(`[NodeSelection] Checking health for node ${nodeId}: state=${node.state}, active=${node.is_active}`)

      // Check if node is active and in good state
      if (node.is_active && ['active', 'on', 'running', 'online'].includes(node.state?.toLowerCase() || '')) {
        isOnline = true
        healthScore += 50
        console.log(`[NodeSelection] Node ${nodeId} is active and in good state`)
      } else if (node.is_active) {
        // Node is active but state might be unknown - give partial credit
        isOnline = true
        healthScore += 30
        console.log(`[NodeSelection] Node ${nodeId} is active but state uncertain: ${node.state}`)
      } else {
        // Node is not active - still give minimal score to allow fallback
        healthScore += 10
        console.log(`[NodeSelection] Node ${nodeId} is not active`)
      }

      // Try to get additional metrics (this might not be available in all VMManager6 setups)
      try {
        // This is a placeholder for actual health metrics
        // In a real implementation, you might call specific VMManager6 endpoints
        // or use monitoring data
        healthScore += 20 // Base score for being reachable
      } catch {
        // Metrics not available, use basic health
        healthScore += 10
      }

      // Bonus for stable nodes (this could be enhanced with historical data)
      if (node.state === 'active') {
        healthScore += 20
      }

      const metrics: NodeHealthMetrics = {
        nodeId,
        isOnline,
        healthScore: Math.min(100, healthScore),
        lastCheck: new Date()
      }

      // Cache the result
      this.nodeHealthCache.set(nodeId, metrics)
      
      console.log(`[NodeSelection] Node ${nodeId} health check:`, {
        isOnline,
        healthScore: metrics.healthScore,
        state: node.state
      })

      return metrics
    } catch (error) {
      console.error(`[NodeSelection] Error checking node ${nodeId} health:`, error)
      
      const metrics: NodeHealthMetrics = {
        nodeId,
        isOnline: false,
        healthScore: 0,
        lastCheck: new Date()
      }
      
      this.nodeHealthCache.set(nodeId, metrics)
      return metrics
    }
  }

  /**
   * Get load score for a node (lower is better)
   */
  async getNodeLoadScore(nodeId: number): Promise<number> {
    try {
      // Get VMs on this node
      const vms = await this.vmAPI.listVms()
      const nodeVms = vms.filter(vm => vm.node === nodeId)
      
      // Simple load calculation based on VM count
      // In a real implementation, you might consider CPU/RAM usage
      const loadScore = nodeVms.length
      
      console.log(`[NodeSelection] Node ${nodeId} load score: ${loadScore} (${nodeVms.length} VMs)`)
      return loadScore
    } catch (error) {
      console.error(`[NodeSelection] Error getting load for node ${nodeId}:`, error)
      return 999 // High load score for error cases
    }
  }

  // ============================================================================
  // Private Selection Methods
  // ============================================================================

  private async selectSpecificNode(
    options: NodeSelectionOptions,
    nodes: NodeInfo[],
    clusters: ClusterInfo[]
  ): Promise<NodeSelectionResult> {
    if (!options.specificNodeId) {
      throw new Error('Specific node ID is required for specific selection strategy')
    }

    const node = nodes.find(n => n.id === options.specificNodeId)
    if (!node) {
      throw new Error(`Specific node ${options.specificNodeId} not found`)
    }

    if (options.requireActiveOnly && !node.is_active) {
      throw new Error(`Specific node ${options.specificNodeId} is not active`)
    }

    // Find which cluster this node belongs to
    let targetCluster: ClusterInfo | undefined
    
    if (options.clusterId) {
      // Validate the node belongs to the specified cluster
      targetCluster = clusters.find(c => c.id === options.clusterId)
      if (!targetCluster || !targetCluster.nodes.includes(node.id)) {
        throw new Error(`Node ${node.id} does not belong to cluster ${options.clusterId}`)
      }
    } else {
      // Find any cluster that contains this node
      targetCluster = clusters.find(c => c.nodes.includes(node.id))
      if (!targetCluster) {
        throw new Error(`Node ${node.id} does not belong to any cluster`)
      }
    }

    const validIpPools = await this.getValidIpPoolsForCluster(targetCluster.id)

    return {
      nodeId: node.id,
      clusterId: targetCluster.id,
      validIpPools,
      selectionReason: `Specific node ${node.id} (${node.name}) requested`
    }
  }

  private async selectLoadBalancedNode(
    options: NodeSelectionOptions,
    nodes: NodeInfo[],
    clusters: ClusterInfo[]
  ): Promise<NodeSelectionResult> {
    // Filter nodes by cluster if specified
    let candidateNodes = nodes
    let targetCluster: ClusterInfo | undefined

    if (options.clusterId) {
      targetCluster = clusters.find(c => c.id === options.clusterId)
      if (!targetCluster) {
        throw new Error(`Cluster ${options.clusterId} not found`)
      }
      candidateNodes = nodes.filter(n => targetCluster!.nodes.includes(n.id))
    }

    // Filter by active status if required
    if (options.requireActiveOnly) {
      candidateNodes = candidateNodes.filter(n => n.is_active)
    }

    // Exclude specific nodes if requested
    if (options.excludeNodes?.length) {
      candidateNodes = candidateNodes.filter(n => !options.excludeNodes!.includes(n.id))
    }

    if (candidateNodes.length === 0) {
      throw new Error('No suitable nodes available for load balancing')
    }

    // Get load scores for all candidate nodes
    const nodeLoads = await Promise.all(
      candidateNodes.map(async (node) => ({
        node,
        loadScore: await this.getNodeLoadScore(node.id)
      }))
    )

    // Sort by load (ascending - lower load is better)
    nodeLoads.sort((a, b) => a.loadScore - b.loadScore)
    
    const selectedNode = nodeLoads[0].node
    const loadScore = nodeLoads[0].loadScore

    if (!targetCluster) {
      targetCluster = clusters.find(c => c.nodes.includes(selectedNode.id))
      if (!targetCluster) {
        throw new Error(`Selected node ${selectedNode.id} does not belong to any cluster`)
      }
    }

    const validIpPools = await this.getValidIpPoolsForCluster(targetCluster.id)

    return {
      nodeId: selectedNode.id,
      clusterId: targetCluster.id,
      validIpPools,
      selectionReason: `Load-balanced selection: ${selectedNode.name} (load: ${loadScore})`,
      loadScore
    }
  }

  private async selectHealthBasedNode(
    options: NodeSelectionOptions,
    nodes: NodeInfo[],
    clusters: ClusterInfo[]
  ): Promise<NodeSelectionResult> {
    // Filter nodes by cluster if specified
    let candidateNodes = nodes
    let targetCluster: ClusterInfo | undefined

    if (options.clusterId) {
      targetCluster = clusters.find(c => c.id === options.clusterId)
      if (!targetCluster) {
        throw new Error(`Cluster ${options.clusterId} not found`)
      }
      candidateNodes = nodes.filter(n => targetCluster!.nodes.includes(n.id))
    }

    // Filter by active status if required
    if (options.requireActiveOnly) {
      candidateNodes = candidateNodes.filter(n => n.is_active)
    }

    // Exclude specific nodes if requested
    if (options.excludeNodes?.length) {
      candidateNodes = candidateNodes.filter(n => !options.excludeNodes!.includes(n.id))
    }

    if (candidateNodes.length === 0) {
      throw new Error('No suitable nodes available for health-based selection')
    }

    // Get health scores for all candidate nodes
    const nodeHealths = await Promise.all(
      candidateNodes.map(async (node) => ({
        node,
        health: await this.checkNodeHealth(node.id)
      }))
    )

    // Filter out unhealthy nodes
    const healthyNodes = nodeHealths.filter(nh => nh.health.isOnline && nh.health.healthScore > 50)
    
    if (healthyNodes.length === 0) {
      throw new Error('No healthy nodes available')
    }

    // Sort by health score (descending - higher is better)
    healthyNodes.sort((a, b) => b.health.healthScore - a.health.healthScore)
    
    const selectedNode = healthyNodes[0].node
    const healthScore = healthyNodes[0].health.healthScore

    if (!targetCluster) {
      targetCluster = clusters.find(c => c.nodes.includes(selectedNode.id))
      if (!targetCluster) {
        throw new Error(`Selected node ${selectedNode.id} does not belong to any cluster`)
      }
    }

    const validIpPools = await this.getValidIpPoolsForCluster(targetCluster.id)

    return {
      nodeId: selectedNode.id,
      clusterId: targetCluster.id,
      validIpPools,
      selectionReason: `Health-based selection: ${selectedNode.name} (health: ${healthScore})`,
      healthScore
    }
  }

  private async selectAutoNode(
    options: NodeSelectionOptions,
    nodes: NodeInfo[],
    clusters: ClusterInfo[]
  ): Promise<NodeSelectionResult> {
    // Auto selection combines health and load balancing
    // Filter nodes by cluster if specified
    let candidateNodes = nodes
    let targetCluster: ClusterInfo | undefined

    console.log(`[NodeSelection] 🎯 Starting auto selection with ${nodes.length} total nodes`)
    console.log('[NodeSelection] All available nodes:', nodes.map(n => ({
      id: n.id,
      name: n.name,
      cluster: n.cluster,
      state: n.state,
      is_active: n.is_active
    })))
    console.log('[NodeSelection] All available clusters:', clusters.map(c => ({
      id: c.id,
      name: c.name,
      nodes: c.nodes
    })))

    if (options.clusterId) {
      targetCluster = clusters.find(c => c.id === options.clusterId)
      if (!targetCluster) {
        console.error(`[NodeSelection] ❌ Cluster ${options.clusterId} not found in available clusters`)
        throw new Error(`Cluster ${options.clusterId} not found`)
      }
      console.log(`[NodeSelection] 📍 Filtering by cluster ${options.clusterId} (${targetCluster.name}), cluster has nodes: [${targetCluster.nodes.join(', ')}]`)
      candidateNodes = nodes.filter(n => targetCluster!.nodes.includes(n.id))
      console.log(`[NodeSelection] After cluster filter: ${candidateNodes.length} nodes`)
      console.log('[NodeSelection] Candidate nodes after cluster filter:', candidateNodes.map(n => ({
        id: n.id,
        name: n.name,
        state: n.state,
        is_active: n.is_active
      })))
    }

    // Log node states before filtering
    console.log('[NodeSelection] 📊 Node states before active filter:')
    candidateNodes.forEach(node => {
      console.log(`  - Node ${node.id}: ${node.name} (state: ${node.state}, active: ${node.is_active}, cluster: ${node.cluster})`)
    })

    // Always require active nodes for auto selection
    const activeNodes = candidateNodes.filter(n => n.is_active)
    console.log(`[NodeSelection] Active nodes: ${activeNodes.length}/${candidateNodes.length}`)

    if (activeNodes.length === 0) {
      console.warn('[NodeSelection] No active nodes found, trying with all nodes in cluster')
      candidateNodes = candidateNodes
    } else {
      candidateNodes = activeNodes
    }

    // Exclude specific nodes if requested
    if (options.excludeNodes?.length) {
      candidateNodes = candidateNodes.filter(n => !options.excludeNodes!.includes(n.id))
      console.log(`[NodeSelection] After exclusion filter: ${candidateNodes.length} nodes`)
    }

    if (candidateNodes.length === 0) {
      throw new Error('No suitable nodes available for auto selection')
    }

    // Get both health and load scores
    const nodeScores = await Promise.all(
      candidateNodes.map(async (node) => {
        const [health, loadScore] = await Promise.all([
          this.checkNodeHealth(node.id),
          this.getNodeLoadScore(node.id)
        ])
        
        // Calculate combined score (health is more important than load)
        // Health: 0-100, Load: 0-N (lower is better)
        // Normalize load to 0-100 scale (assuming max 50 VMs per node)
        const normalizedLoad = Math.min(100, (loadScore / 50) * 100)
        const combinedScore = (health.healthScore * 0.7) + ((100 - normalizedLoad) * 0.3)
        
        return {
          node,
          health,
          loadScore,
          combinedScore
        }
      })
    )

    // Filter out unhealthy nodes - смягчаем требования
    const viableNodes = nodeScores.filter(ns => {
      // Принимаем узлы если они онлайн ИЛИ имеют минимальный health score
      const isViable = ns.health.isOnline || ns.health.healthScore > 10
      console.log(`[NodeSelection] Node ${ns.node.id} viability: online=${ns.health.isOnline}, health=${ns.health.healthScore}, viable=${isViable}`)
      return isViable
    })
    
    console.log(`[NodeSelection] Viable nodes after health filter: ${viableNodes.length}/${nodeScores.length}`)
    
    if (viableNodes.length === 0) {
      console.warn('[NodeSelection] No viable nodes found, selecting best available')
      if (nodeScores.length > 0) {
        nodeScores.sort((a, b) => b.combinedScore - a.combinedScore)
        const fallbackSelected = nodeScores[0]
        
        if (!targetCluster) {
          targetCluster = clusters.find(c => c.nodes.includes(fallbackSelected.node.id))
          if (!targetCluster) {
            throw new Error(`Selected node ${fallbackSelected.node.id} does not belong to any cluster`)
          }
        }

        const validIpPools = await this.getValidIpPoolsForCluster(targetCluster.id)

        return {
          nodeId: fallbackSelected.node.id,
          clusterId: targetCluster.id,
          validIpPools,
          selectionReason: `Fallback selection: ${fallbackSelected.node.name} (health: ${fallbackSelected.health.healthScore}, load: ${fallbackSelected.loadScore}, score: ${fallbackSelected.combinedScore.toFixed(1)})`,
          healthScore: fallbackSelected.health.healthScore,
          loadScore: fallbackSelected.loadScore
        }
      }
      throw new Error('No viable nodes available')
    }

    // Sort by combined score (descending - higher is better)
    viableNodes.sort((a, b) => b.combinedScore - a.combinedScore)
    
    const selected = viableNodes[0]

    if (!targetCluster) {
      targetCluster = clusters.find(c => c.nodes.includes(selected.node.id))
      if (!targetCluster) {
        throw new Error(`Selected node ${selected.node.id} does not belong to any cluster`)
      }
    }

    const validIpPools = await this.getValidIpPoolsForCluster(targetCluster.id)

    return {
      nodeId: selected.node.id,
      clusterId: targetCluster.id,
      validIpPools,
      selectionReason: `Auto selection: ${selected.node.name} (health: ${selected.health.healthScore}, load: ${selected.loadScore}, score: ${selected.combinedScore.toFixed(1)})`,
      healthScore: selected.health.healthScore,
      loadScore: selected.loadScore
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async getAvailableNodes(): Promise<NodeInfo[]> {
    try {
      console.log('[NodeSelection] 🔍 Fetching nodes from VMManager6 API...')
      const nodes = await this.vmAPI.getNodes()
      console.log(`[NodeSelection] ✅ Received ${nodes.length} nodes from API`)
      
      const nodeInfos = nodes.map(node => ({
        id: node.id,
        name: node.name,
        state: node.state || 'unknown',
        is_active: node.is_active || false,
        cluster: node.cluster
      }))
      
      console.log('[NodeSelection] Processed node infos:', nodeInfos)
      return nodeInfos
    } catch (error) {
      console.error('[NodeSelection] ❌ Error getting nodes:', error)
      console.error('[NodeSelection] Error stack:', error instanceof Error ? error.stack : 'No stack')
      throw new Error('Failed to get available nodes')
    }
  }

  private async getAvailableClusters(): Promise<ClusterInfo[]> {
    try {
      console.log('[NodeSelection] 🔍 Fetching clusters from VMManager6 API...')
      const clusters = await this.vmAPI.getClusters()
      console.log(`[NodeSelection] ✅ Received ${clusters.length} clusters from API`)
      
      const clusterInfos = await Promise.all(
        clusters.map(async (cluster) => {
          // Get IP pools for this cluster
          let ipPools: number[] = []
          try {
            const pools = await this.vmAPI.getClusterIPPools(cluster.id)
            ipPools = pools.map(p => p.id)
            console.log(`[NodeSelection] Cluster ${cluster.id} has ${ipPools.length} IP pools: [${ipPools.join(', ')}]`)
          } catch (error) {
            console.warn(`[NodeSelection] ⚠️ Could not get IP pools for cluster ${cluster.id}:`, error)
          }

          return {
            id: cluster.id,
            name: cluster.name,
            nodes: cluster.nodes || [], // Now this should be populated correctly
            ip_pools: ipPools,
            is_active: true, // Assume active if returned by API
            country_code: cluster.country_code
          }
        })
      )

      // Log cluster-node relationships for debugging
      console.log('[NodeSelection] 📊 Cluster-node relationships:')
      clusterInfos.forEach(cluster => {
        console.log(`  - Cluster ${cluster.id} (${cluster.name}): nodes [${cluster.nodes.join(', ')}], pools [${cluster.ip_pools.join(', ')}]`)
      })

      return clusterInfos
    } catch (error) {
      console.error('[NodeSelection] ❌ Error getting clusters:', error)
      console.error('[NodeSelection] Error stack:', error instanceof Error ? error.stack : 'No stack')
      throw new Error('Failed to get available clusters')
    }
  }

  /**
   * Clear health cache (useful for testing or forced refresh)
   */
  clearHealthCache(): void {
    this.nodeHealthCache.clear()
    this.clusterCache.clear()
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let nodeSelectionInstance: NodeSelectionService | null = null

/**
 * Get singleton instance of NodeSelectionService
 */
export function getNodeSelectionService(): NodeSelectionService {
  if (!nodeSelectionInstance) {
    nodeSelectionInstance = new NodeSelectionService()
  }
  return nodeSelectionInstance
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick node selection with default options
 */
export async function selectBestNode(options: NodeSelectionOptions = {}): Promise<NodeSelectionResult> {
  const service = getNodeSelectionService()
  return service.selectNode(options)
}

/**
 * Validate that a node belongs to a cluster
 */
export async function validateNodeClusterCompatibility(nodeId: number, clusterId: number): Promise<boolean> {
  const service = getNodeSelectionService()
  return service.validateNodeClusterCompatibility(nodeId, clusterId)
}

/**
 * Get valid IP pools for a cluster
 */
export async function getValidIpPoolsForCluster(clusterId: number): Promise<number[]> {
  const service = getNodeSelectionService()
  return service.getValidIpPoolsForCluster(clusterId)
}