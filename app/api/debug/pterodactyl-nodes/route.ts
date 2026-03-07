import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const PTERODACTYL_URL = process.env.PTERODACTYL_URL
    const PTERODACTYL_API_KEY = process.env.PTERODACTYL_API_KEY

    if (!PTERODACTYL_URL || !PTERODACTYL_API_KEY) {
      return NextResponse.json({ 
        error: 'Pterodactyl not configured',
        configured: false 
      })
    }

    // Получаем ноды из БД
    const dbNodes = await prisma.pterodactylNode.findMany({
      select: {
        id: true,
        name: true,
        pterodactylId: true,
        isActive: true,
        isFree: true,
        nodeType: true,
      }
    })

    // Получаем ноды из Pterodactyl API
    const response = await fetch(`${PTERODACTYL_URL}/api/application/nodes`, {
      headers: {
        'Authorization': `Bearer ${PTERODACTYL_API_KEY}`,
        'Accept': 'application/json',
      }
    })

    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Failed to fetch from Pterodactyl',
        status: response.status,
        dbNodes 
      })
    }

    const data = await response.json()
    const pteroNodes = data.data.map((item: any) => ({
      id: item.attributes.id,
      name: item.attributes.name,
      fqdn: item.attributes.fqdn,
      scheme: item.attributes.scheme,
      memory: item.attributes.memory,
      disk: item.attributes.disk,
      daemon_listen: item.attributes.daemon_listen,
      daemon_sftp: item.attributes.daemon_sftp,
      allocated_memory: item.attributes.allocated_resources?.memory || 0,
      allocated_disk: item.attributes.allocated_resources?.disk || 0,
    }))

    // Проверяем доступность Wings на каждой ноде
    const nodesWithStatus = await Promise.all(
      pteroNodes.map(async (node: any) => {
        const wingsUrl = `${node.scheme}://${node.fqdn}:${node.daemon_listen}`
        let wingsStatus = 'unknown'
        
        try {
          const wingsResponse = await fetch(wingsUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(3000), // 3 секунды таймаут
          })
          wingsStatus = wingsResponse.ok ? 'online' : 'error'
        } catch (error) {
          wingsStatus = 'offline'
        }

        const dbNode = dbNodes.find(n => n.pterodactylId === node.id)

        return {
          ...node,
          wingsStatus,
          wingsUrl,
          inDatabase: !!dbNode,
          dbActive: dbNode?.isActive,
          dbFree: dbNode?.isFree,
          dbType: dbNode?.nodeType,
        }
      })
    )

    return NextResponse.json({
      configured: true,
      pterodactylUrl: PTERODACTYL_URL,
      totalNodes: pteroNodes.length,
      dbNodes: dbNodes.length,
      nodes: nodesWithStatus,
    })
  } catch (error) {
    console.error('[Debug Pterodactyl Nodes] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
