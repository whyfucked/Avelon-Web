import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth-admin'

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const plans = await prisma.plan.findMany({
      include: {
        egg: true,
        eggOptions: {
          include: {
            egg: true,
          },
        },
        _count: { select: { servers: true } },
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    })
    return NextResponse.json(plans)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const allowedEggIds: string[] = Array.isArray(body.allowedEggIds)
      ? body.allowedEggIds.filter((id: unknown): id is string => typeof id === 'string')
      : []
    
    const plan = await prisma.plan.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        category: body.category || 'MINECRAFT',
        ram: body.ram,
        cpu: body.cpu,
        disk: body.disk,
        databases: body.databases || 1,
        backups: body.backups || 3,
        allocations: body.allocations || 1,
        price: body.price,
        isFree: body.isFree ?? false,
        eggId: allowedEggIds[0] ?? body.eggId ?? null,
        mobIcon: body.mobIcon,
        customIcon: body.customIcon,
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder || 0,
        // VDS-specific fields
        vmPresetId: body.vmPresetId ?? null,
        vmClusterId: body.vmClusterId ?? null,
        vmIpPoolId: body.vmIpPoolId ?? null,
        vdsCustomSpecs: body.vdsCustomSpecs ?? null,
        // Node selection fields
        vmNodeId: body.vmNodeId ?? null,
        vmNodeStrategy: body.vmNodeStrategy ?? null,
      },
    })

    if (allowedEggIds.length > 0) {
      await prisma.planEggOption.createMany({
        data: allowedEggIds.map((eggId) => ({ planId: plan.id, eggId })),
        skipDuplicates: true,
      })
    }

    const fullPlan = await prisma.plan.findUnique({
      where: { id: plan.id },
      include: {
        egg: true,
        eggOptions: { include: { egg: true } },
        _count: { select: { servers: true } },
      },
    })
    
    return NextResponse.json(fullPlan)
  } catch (error) {
    console.error('Create plan error:', error)
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, allowedEggIds, ...data } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 })
    }

    const normalizedEggIds: string[] = Array.isArray(allowedEggIds)
      ? allowedEggIds.filter((v: unknown): v is string => typeof v === 'string')
      : []
    
    const plan = await prisma.plan.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.ram !== undefined && { ram: data.ram }),
        ...(data.cpu !== undefined && { cpu: data.cpu }),
        ...(data.disk !== undefined && { disk: data.disk }),
        ...(data.databases !== undefined && { databases: data.databases }),
        ...(data.backups !== undefined && { backups: data.backups }),
        ...(data.allocations !== undefined && { allocations: data.allocations }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.isFree !== undefined && { isFree: data.isFree }),
        ...(normalizedEggIds.length > 0 && { eggId: normalizedEggIds[0] }),
        ...(data.eggId !== undefined && normalizedEggIds.length === 0 && { eggId: data.eggId }),
        ...(data.mobIcon !== undefined && { mobIcon: data.mobIcon }),
        ...(data.customIcon !== undefined && { customIcon: data.customIcon }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        // VDS-specific fields
        ...(data.vmPresetId !== undefined && { vmPresetId: data.vmPresetId }),
        ...(data.vmClusterId !== undefined && { vmClusterId: data.vmClusterId }),
        ...(data.vmIpPoolId !== undefined && { vmIpPoolId: data.vmIpPoolId }),
        ...(data.vdsCustomSpecs !== undefined && { vdsCustomSpecs: data.vdsCustomSpecs }),
        // Node selection fields
        ...(data.vmNodeId !== undefined && { vmNodeId: data.vmNodeId }),
        ...(data.vmNodeStrategy !== undefined && { vmNodeStrategy: data.vmNodeStrategy }),
      },
    })

    if (Array.isArray(allowedEggIds)) {
      await prisma.planEggOption.deleteMany({ where: { planId: id } })

      if (normalizedEggIds.length > 0) {
        await prisma.planEggOption.createMany({
          data: normalizedEggIds.map((eggId) => ({ planId: id, eggId })),
          skipDuplicates: true,
        })
      }
    }

    const fullPlan = await prisma.plan.findUnique({
      where: { id: plan.id },
      include: {
        egg: true,
        eggOptions: { include: { egg: true } },
        _count: { select: { servers: true } },
      },
    })
    
    return NextResponse.json(fullPlan)
  } catch (error) {
    console.error('Update plan error:', error)
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 })
    }

    const activeServersCount = await prisma.server.count({
      where: { planId: id, status: { not: 'DELETED' } },
    })

    if (activeServersCount > 0) {
      return NextResponse.json(
        {
          error: `Нельзя удалить тариф: к нему привязано ${activeServersCount} активных серверов`,
        },
        { status: 400 },
      )
    }

    await prisma.server.deleteMany({
      where: { planId: id, status: 'DELETED' },
    })

    await prisma.plan.delete({ where: { id } })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete plan error:', error)
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 })
  }
}
