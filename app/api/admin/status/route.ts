import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth-admin'

export async function GET() {
  try {
    const statuses = await prisma.serviceStatus.findMany({
      include: {
        node: true,
        history: {
          orderBy: { checkedAt: 'desc' },
          take: 288,
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json(statuses)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch statuses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { name, type, url, nodeId, sortOrder, routerIp, routerPort } = body

    const status = await prisma.serviceStatus.create({
      data: {
        name,
        type,
        url: url || null,
        nodeId: nodeId || null,
        routerIp: routerIp || null,
        routerPort: routerPort || null,
        sortOrder: sortOrder || 0,
        isSystem: false,
      },
      include: { node: true },
    })

    return NextResponse.json(status)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create status' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, name, url, nodeId, sortOrder, routerIp, routerPort } = body

    const existing = await prisma.serviceStatus.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Status not found' }, { status: 404 })
    }

    const status = await prisma.serviceStatus.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        url: url !== undefined ? url : existing.url,
        nodeId: nodeId !== undefined ? nodeId : existing.nodeId,
        routerIp: routerIp !== undefined ? routerIp : existing.routerIp,
        routerPort: routerPort !== undefined ? routerPort : existing.routerPort,
        sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
      },
      include: { node: true },
    })

    return NextResponse.json(status)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    const existing = await prisma.serviceStatus.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Status not found' }, { status: 404 })
    }

    if (existing.isSystem) {
      return NextResponse.json({ error: 'Cannot delete system status' }, { status: 400 })
    }

    await prisma.serviceStatus.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete status' }, { status: 500 })
  }
}
