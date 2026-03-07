/**
 * VMManager OS Images API
 * Управление ОС образами для VDS
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth-admin'
import { getVmManager } from '@/vm6/VmManager'
import { prisma } from '@/lib/db'

// GET - получить список ОС (из БД с флагом isActive)
export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    // Получаем из БД
    const dbImages = await prisma.vdsOsImage.findMany({
      orderBy: { sortOrder: 'asc' }
    })

    // Если в БД пусто, синхронизируем с VMManager
    if (dbImages.length === 0) {
      const vm = getVmManager()
      const vmImages = await vm.getOsImages()
      
      // Создаём записи в БД
      for (const img of vmImages) {
        await prisma.vdsOsImage.create({
          data: {
            vmManagerId: img.id,
            name: img.name,
            isActive: true,
            sortOrder: img.id
          }
        })
      }
      
      const newImages = await prisma.vdsOsImage.findMany({
        orderBy: { sortOrder: 'asc' }
      })
      return NextResponse.json(newImages)
    }

    return NextResponse.json(dbImages)
  } catch (error) {
    console.error('[Admin VMManager] Error fetching OS images:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch OS images' },
      { status: 500 }
    )
  }
}

// POST - синхронизировать ОС с VMManager
export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const vm = getVmManager()
    const vmImages = await vm.getOsImages()
    
    let created = 0
    let updated = 0

    for (const img of vmImages) {
      const existing = await prisma.vdsOsImage.findUnique({
        where: { vmManagerId: img.id }
      })

      if (existing) {
        await prisma.vdsOsImage.update({
          where: { vmManagerId: img.id },
          data: { name: img.name }
        })
        updated++
      } else {
        await prisma.vdsOsImage.create({
          data: {
            vmManagerId: img.id,
            name: img.name,
            isActive: true,
            sortOrder: img.id
          }
        })
        created++
      }
    }

    return NextResponse.json({ 
      success: true, 
      created, 
      updated,
      total: vmImages.length 
    })
  } catch (error) {
    console.error('[Admin VMManager] Error syncing OS images:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync OS images' },
      { status: 500 }
    )
  }
}

// PATCH - обновить статус ОС (включить/выключить)
export async function PATCH(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, vmManagerId, isActive, sortOrder } = body

    // Поддерживаем оба варианта: id (String cuid) или vmManagerId (Int)
    if (!id && !vmManagerId) {
      return NextResponse.json({ error: 'ID or vmManagerId is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (typeof sortOrder === 'number') updateData.sortOrder = sortOrder

    let updated
    if (id && typeof id === 'string') {
      // Если передан String id (cuid)
      updated = await prisma.vdsOsImage.update({
        where: { id },
        data: updateData
      })
    } else {
      // Если передан vmManagerId (Int)
      const vmId = typeof vmManagerId === 'number' ? vmManagerId : (typeof id === 'number' ? id : parseInt(id))
      updated = await prisma.vdsOsImage.update({
        where: { vmManagerId: vmId },
        data: updateData
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[Admin VMManager] Error updating OS image:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update OS image' },
      { status: 500 }
    )
  }
}
