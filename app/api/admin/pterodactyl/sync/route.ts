import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAllEggs, getNodes, getLocations } from '@/lib/pterodactyl'
import { requireAdminAuth } from '@/lib/auth-admin'

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const eggs = await getAllEggs()
    const eggPterodactylIds = eggs.map(e => e.id)
    let eggsCreated = 0
    let eggsUpdated = 0
    let eggsDeleted = 0
    
    for (const egg of eggs) {
      const existing = await prisma.pterodactylEgg.findUnique({
        where: { pterodactylId: egg.id }
      })
      
      if (existing) {
        await prisma.pterodactylEgg.update({
          where: { pterodactylId: egg.id },
          data: {
            name: egg.name,
            nestId: egg.nest,
            nestName: egg.nestName,
            description: egg.description || null,
            dockerImage: egg.docker_image,
            startup: egg.startup,
          },
        })
        eggsUpdated++
      } else {
        await prisma.pterodactylEgg.create({
          data: {
            pterodactylId: egg.id,
            nestId: egg.nest,
            nestName: egg.nestName,
            name: egg.name,
            description: egg.description || null,
            dockerImage: egg.docker_image,
            startup: egg.startup,
          },
        })
        eggsCreated++
      }
    }

    const deletedEggs = await prisma.pterodactylEgg.deleteMany({
      where: {
        pterodactylId: { notIn: eggPterodactylIds },
        plans: { none: {} },
        servers: { none: {} },
      },
    })
    eggsDeleted = deletedEggs.count

    await prisma.pterodactylEgg.updateMany({
      where: {
        pterodactylId: { notIn: eggPterodactylIds },
      },
      data: { isActive: false },
    })

    const nodes = await getNodes()
    const locations = await getLocations()
    const nodePterodactylIds = nodes.map(n => n.id)
    let nodesCreated = 0
    let nodesUpdated = 0
    let nodesDeleted = 0
    
    for (const node of nodes) {
      const location = locations.find(l => l.id === node.location_id)
      const existing = await prisma.pterodactylNode.findUnique({
        where: { pterodactylId: node.id }
      })
      
      if (existing) {
        await prisma.pterodactylNode.update({
          where: { pterodactylId: node.id },
          data: {
            name: node.name,
            fqdn: node.fqdn,
            locationId: node.location_id,
            locationName: location?.long || location?.short || null,
            memory: node.memory,
            memoryOverallocate: node.memory_overallocate,
            disk: node.disk,
            diskOverallocate: node.disk_overallocate,
          },
        })
        nodesUpdated++
      } else {
        await prisma.pterodactylNode.create({
          data: {
            pterodactylId: node.id,
            name: node.name,
            fqdn: node.fqdn,
            locationId: node.location_id,
            locationName: location?.long || location?.short || null,
            memory: node.memory,
            memoryOverallocate: node.memory_overallocate,
            disk: node.disk,
            diskOverallocate: node.disk_overallocate,
          },
        })
        nodesCreated++
      }
    }

    const deletedNodes = await prisma.pterodactylNode.deleteMany({
      where: {
        pterodactylId: { notIn: nodePterodactylIds },
        servers: { none: {} },
      },
    })
    nodesDeleted = deletedNodes.count

    await prisma.pterodactylNode.updateMany({
      where: {
        pterodactylId: { notIn: nodePterodactylIds },
      },
      data: { isActive: false },
    })

    return NextResponse.json({ 
      success: true, 
      synced: { 
        eggs: {
          created: eggsCreated,
          updated: eggsUpdated,
          deleted: eggsDeleted,
          total: eggs.length,
        },
        nodes: {
          created: nodesCreated,
          updated: nodesUpdated,
          deleted: nodesDeleted,
          total: nodes.length,
        },
      } 
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ 
      error: 'Failed to sync', 
      details: String(error) 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const eggs = await prisma.pterodactylEgg.findMany({
      orderBy: [{ nestName: 'asc' }, { name: 'asc' }],
    })
    
    const nodes = await prisma.pterodactylNode.findMany({
      orderBy: { name: 'asc' },
    })
    
    return NextResponse.json({ eggs, nodes })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
