import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { 
  suspendServer, 
  unsuspendServer, 
  deleteServer as deletePterodactylServer,
  getPterodactylServerStatus
} from '@/lib/pterodactyl'
import { requireAdminAuth } from '@/lib/auth-admin'

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const servers = await prisma.server.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
        plan: { select: { id: true, name: true, price: true } },
        egg: { select: { id: true, name: true } },
        node: { select: { id: true, name: true, locationName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const updatedServers = await Promise.all(
      servers.map(async (server: typeof servers[0]) => {
        // Пропускаем удалённые серверы
        if ((server.status as string) === 'DELETED') {
          return server
        }
        
        if (server.pterodactylId && server.pterodactylUuid) {
          try {
            const statusData = await getPterodactylServerStatus(server.pterodactylUuid)
            let newStatus: typeof server.status = server.status

            // Если статус unknown (таймаут/недоступен) - оставляем текущий статус
            if (statusData.state === 'unknown') {
              return server
            }

            if ((server.status as string) === 'DELETED') {
              return server
            } else if (server.status === 'SUSPENDED') {
              newStatus = 'SUSPENDED'
            } else if (server.status === 'INSTALLING' && statusData.state === 'running') {
              newStatus = 'ACTIVE'
            } else if (server.status === 'INSTALLING' && (statusData.state === 'starting' || statusData.state === 'stopping' || statusData.state === 'restarting')) {
              newStatus = 'RESTARTING'
            } else if (server.status === 'INSTALLING' && statusData.state === 'offline') {
              const createdAt = new Date(server.createdAt)
              const now = new Date()
              const minutesAgo = (now.getTime() - createdAt.getTime()) / (1000 * 60)
              
              if (minutesAgo > 5) {
                newStatus = 'OFF'
              } else {
                newStatus = 'INSTALLING'
              }
            } else if (server.status === 'INSTALLING') {
              newStatus = 'INSTALLING'
            } else if (statusData.is_suspended) {
              newStatus = 'SUSPENDED'
            } else if (statusData.state === 'installing' || statusData.state === 'reinstalling') {
              newStatus = 'INSTALLING'
            } else if (statusData.state === 'starting') {
              newStatus = 'RESTARTING'
            } else if (statusData.state === 'stopping') {
              newStatus = 'RESTARTING'
            } else if (statusData.state === 'restarting') {
              newStatus = 'RESTARTING'
            } else if (statusData.state === 'stopped') {
              newStatus = 'OFF'
            } else if (statusData.state === 'offline') {
              newStatus = 'OFF'
            } else if (statusData.state === 'running') {
              newStatus = 'ACTIVE'
            } else {
              newStatus = 'ACTIVE'
            }

            return { ...server, status: newStatus }
          } catch (error) {
            console.error(`Failed to sync status for server ${server.id}:`, error)
            // При ошибке возвращаем сервер с текущим статусом
            return server
          }
        }
        return server
      })
    )

    return NextResponse.json(updatedServers)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch servers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { action, serverId, force } = body
    
    const server = await prisma.server.findUnique({ where: { id: serverId } })
    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }
    
    switch (action) {
      case 'suspend':
        if (!server.pterodactylId) {
          return NextResponse.json({ error: 'Server not linked to Pterodactyl' }, { status: 400 })
        }
        await suspendServer(server.pterodactylId)
        await prisma.server.update({
          where: { id: serverId },
          data: { status: 'SUSPENDED' },
        })
        break
        
      case 'unsuspend':
        if (!server.pterodactylId) {
          return NextResponse.json({ error: 'Server not linked to Pterodactyl' }, { status: 400 })
        }
        await unsuspendServer(server.pterodactylId)
        await prisma.server.update({
          where: { id: serverId },
          data: { status: 'ACTIVE' },
        })
        break
        
      case 'delete':
        // Пробуем удалить из Pterodactyl, но если force=true - удаляем из БД в любом случае
        if (server.pterodactylId) {
          try {
            await deletePterodactylServer(server.pterodactylId, true)
          } catch (pterodactylError) {
            console.error('Pterodactyl delete error:', pterodactylError)
            // Если force=true - игнорируем ошибку Pterodactyl и удаляем из БД
            if (!force) {
              return NextResponse.json({ 
                error: 'Не удалось удалить сервер из Pterodactyl. Используйте принудительное удаление.',
                pterodactylError: String(pterodactylError)
              }, { status: 500 })
            }
          }
        }
        await prisma.server.update({
          where: { id: serverId },
          data: { status: 'DELETED' },
        })
        break
        
      case 'force_delete':
        // Принудительное удаление - только из БД, без обращения к Pterodactyl
        await prisma.server.update({
          where: { id: serverId },
          data: { status: 'DELETED' },
        })
        break
        
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Server action error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, ...data } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Server ID required' }, { status: 400 })
    }
    
    const server = await prisma.server.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.expiresAt !== undefined && { expiresAt: new Date(data.expiresAt) }),
        ...(data.status !== undefined && { status: data.status }),
      },
    })
    
    return NextResponse.json(server)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update server' }, { status: 500 })
  }
}
