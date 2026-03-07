/**
 * Simple debug endpoint for nodes (no auth required)
 */

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    console.log('[Debug] Simple nodes test starting...')
    
    // Test 1: Load from config file
    const configPath = path.join(process.cwd(), 'data', 'vmmanager6-nodes.json')
    console.log('[Debug] Config path:', configPath)
    console.log('[Debug] Config exists:', fs.existsSync(configPath))
    
    if (!fs.existsSync(configPath)) {
      return NextResponse.json({
        success: false,
        error: 'Config file not found',
        configPath,
        hardcodedNodes: getHardcodedNodes()
      })
    }
    
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    console.log('[Debug] Config data loaded:', Object.keys(configData))
    
    const nodes = configData.nodes || []
    console.log('[Debug] Nodes from config:', nodes.length)
    
    // Transform nodes
    const vmNodes = nodes.map((node: any) => ({
      id: node.id,
      name: node.name,
      cluster: node.cluster,
      is_active: node.is_active,
      state: node.state
    }))
    
    return NextResponse.json({
      success: true,
      source: 'config',
      configPath,
      nodesCount: vmNodes.length,
      nodes: vmNodes,
      rawConfig: configData
    })
    
  } catch (error) {
    console.error('[Debug] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      hardcodedNodes: getHardcodedNodes()
    })
  }
}

function getHardcodedNodes() {
  return [
    {
      id: 1,
      name: 'Promo-1-R7-1700X-PRO',
      cluster: 11,
      is_active: true,
      state: 'active'
    },
    {
      id: 2,
      name: 'DE-I5-1250',
      cluster: 10,
      is_active: true,
      state: 'active'
    },
    {
      id: 3,
      name: 'RU-NODE',
      cluster: 9,
      is_active: true,
      state: 'active'
    }
  ]
}