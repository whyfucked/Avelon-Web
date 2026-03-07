import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth-admin'

// DELETE - удаление узла (принудительное, даже если недоступен)
export async function DELETE(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const force = searchParams.get('force') === 'true'
    
    if (!id) {
      return NextResponse.json({ error: 'Node ID required' }, { status: 400 })
    }
    
    const node = await prisma.pterodactylNode.findUnique({
      where: { id },
      include: { _count: { select: { servers: true } } }
    })
    
    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 })
    }
    
    // Если есть сервера и не force - предупреждаем
    if (node._count.servers > 0 && !force) {
      return NextResponse.json({ 
        error: `На узле ${node._count.servers} серверов. Используйте force=true для принудительного удаления`,
        serversCount: node._count.servers
      }, { status: 400 })
    }
    
    // Если force - удаляем все сервера на этом узле из БД
    if (force && node._count.servers > 0) {
      await prisma.server.updateMany({
        where: { nodeId: id },
        data: { status: 'DELETED' }
      })
    }
    
    // Удаляем связанные статусы
    await prisma.serviceStatus.deleteMany({
      where: { nodeId: id }
    })
    
    // Удаляем узел
    await prisma.pterodactylNode.delete({
      where: { id }
    })
    
    return NextResponse.json({ 
      success: true, 
      message: `Узел ${node.name} удалён${force ? ` (${node._count.servers} серверов помечены как удалённые)` : ''}`
    })
  } catch (error) {
    console.error('DELETE /api/admin/nodes error:', error)
    return NextResponse.json({ error: 'Failed to delete node', details: String(error) }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const nodes = await prisma.pterodactylNode.findMany({
      include: {
        _count: { select: { servers: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(nodes)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch nodes' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    console.log('PATCH /api/admin/nodes - body:', JSON.stringify(body))
    const { id, ...data } = body
    
    if (!id) {
      console.error('Node ID is missing')
      return NextResponse.json({ error: 'Node ID required' }, { status: 400 })
    }
    
    console.log('Updating node:', id, 'with data:', JSON.stringify(data))
    
    const node = await prisma.pterodactylNode.update({
      where: { id },
      data: {
        ...(data.countryCode !== undefined && { countryCode: data.countryCode }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isFree !== undefined && { isFree: data.isFree }),
        ...(data.allowCreation !== undefined && { allowCreation: data.allowCreation }),
        ...(data.priceModifier !== undefined && { priceModifier: data.priceModifier }),
        ...(data.nodeType !== undefined && { nodeType: data.nodeType }),
      },
    })
    
    console.log('Node updated successfully:', node.id)
    return NextResponse.json(node)
  } catch (error) {
    console.error('PATCH /api/admin/nodes error:', error)
    return NextResponse.json({ error: 'Failed to update node', details: String(error) }, { status: 500 })
  }
}
