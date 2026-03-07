/**
 * VMManager Clusters API
 * Управление кластерами (локациями) для VDS
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth-admin'
import { getVmManager } from '@/vm6/VmManager'
import { prisma } from '@/lib/db'

// GET - получить список кластеров из БД
export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const clusters = await prisma.vdsCluster.findMany({
      orderBy: { sortOrder: 'asc' }
    })

    // Если в БД пусто, синхронизируем
    if (clusters.length === 0) {
      const vm = getVmManager()
      const vmClusters = await vm.getClusters()
      
      for (const cluster of vmClusters) {
        await prisma.vdsCluster.create({
          data: {
            vmManagerId: cluster.id,
            name: cluster.name,
            isActive: true,
            sortOrder: cluster.id
          }
        })
      }
      
      const newClusters = await prisma.vdsCluster.findMany({
        orderBy: { sortOrder: 'asc' }
      })
      return NextResponse.json(newClusters)
    }

    return NextResponse.json(clusters)
  } catch (error) {
    console.error('[Admin VMManager] Error fetching clusters:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch clusters' },
      { status: 500 }
    )
  }
}

// POST - синхронизировать кластеры с VMManager
export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const vm = getVmManager()
    const vmClusters = await vm.getClusters()
    
    let created = 0
    let updated = 0

    for (const cluster of vmClusters) {
      const existing = await prisma.vdsCluster.findUnique({
        where: { vmManagerId: cluster.id }
      })

      if (existing) {
        await prisma.vdsCluster.update({
          where: { vmManagerId: cluster.id },
          data: { name: cluster.name }
        })
        updated++
      } else {
        await prisma.vdsCluster.create({
          data: {
            vmManagerId: cluster.id,
            name: cluster.name,
            isActive: true,
            sortOrder: cluster.id
          }
        })
        created++
      }
    }

    return NextResponse.json({ 
      success: true, 
      created, 
      updated,
      total: vmClusters.length 
    })
  } catch (error) {
    console.error('[Admin VMManager] Error syncing clusters:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync clusters' },
      { status: 500 }
    )
  }
}

// PATCH - обновить кластер (включить/выключить, изменить countryCode)
export async function PATCH(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, isActive, countryCode, sortOrder } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (typeof countryCode === 'string') updateData.countryCode = countryCode
    if (typeof sortOrder === 'number') updateData.sortOrder = sortOrder

    const updated = await prisma.vdsCluster.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[Admin VMManager] Error updating cluster:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update cluster' },
      { status: 500 }
    )
  }
}
