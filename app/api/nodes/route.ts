import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getNodeAllocations } from '@/lib/pterodactyl'

export async function GET() {
  try {
    const nodes = await prisma.pterodactylNode.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { servers: true } },
      },
      orderBy: { name: 'asc' },
    })

    const nodesWithAllocations = await Promise.all(
      nodes.map(async (node: any) => {
        let hasAllocations = false
        try {
          const allocations = await getNodeAllocations(node.pterodactylId)
          hasAllocations = allocations.length > 0
        } catch (error: any) {
          // Игнорируем ошибки Cloudflare (403 с HTML) и другие ошибки API
          const errorMessage = error?.message || String(error)
          if (errorMessage.includes('403') || errorMessage.includes('Cloudflare') || errorMessage.includes('<!DOCTYPE html>')) {
            console.log(`[Nodes] Cloudflare protection detected for node ${node.name}, skipping allocation check`)
          } else {
            console.error(`Failed to check allocations for node ${node.name}:`, error)
          }
          // Предполагаем что allocations есть если не можем проверить
          hasAllocations = true
        }

        return {
          id: node.id,
          name: node.name,
          locationName: node.locationName,
          countryCode: node.countryCode,
          isFree: node.isFree,
          priceModifier: node.priceModifier,
          memory: node.memory,
          disk: node.disk,
          nodeType: node.nodeType,
          _count: node._count,
          hasAllocations,
        }
      })
    )

    return NextResponse.json(nodesWithAllocations)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch nodes' }, { status: 500 })
  }
}
