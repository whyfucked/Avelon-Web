import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { sendDiscordLog } from '@/lib/discord'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

async function getUser(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  
  if (!token) return null
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    return await prisma.user.findUnique({ where: { id: decoded.userId } })
  } catch {
    return null
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const server = await prisma.server.findUnique({
      where: { id },
      include: { plan: true, node: true },
    })

    if (!server) {
      return NextResponse.json({ error: 'Сервер не найден' }, { status: 404 })
    }

    if (server.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    let refundAmount = 0
    if (server.expiresAt) {
      const now = new Date()
      const expires = new Date(server.expiresAt)
      const msRemaining = expires.getTime() - now.getTime()
      
      if (msRemaining > 0) {
        const daysRemaining = msRemaining / (1000 * 60 * 60 * 24)
        // Используем paidAmount если есть, иначе plan.price + node.priceModifier
        const actualPaidPrice = server.paidAmount ?? (server.plan.price + (server.node?.priceModifier ?? 0))
        const dailyRate = actualPaidPrice / 30
        refundAmount = Math.floor(daysRemaining * dailyRate)
      }
    }

    if (server.pterodactylId) {
      try {
        const pteroUrl = process.env.PTERODACTYL_URL
        const pteroKey = process.env.PTERODACTYL_API_KEY
        
        if (pteroUrl && pteroKey) {
          await fetch(`${pteroUrl}/api/application/servers/${server.pterodactylId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${pteroKey}`,
              'Accept': 'application/json',
            },
          })
        }
      } catch (err) {
        console.error('Failed to delete server from Pterodactyl:', err)
      }
    }

    if (refundAmount > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { balance: { increment: refundAmount } },
      })

      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'REFUND',
          amount: refundAmount,
          description: `Возврат за сервер "${server.name}"`,
          serverId: server.id,
        },
      })
    }

    await prisma.server.delete({ where: { id } })

    // Отправляем лог в Discord
    await sendDiscordLog({
      type: 'SERVER_DELETE',
      userId: user.id,
      userEmail: user.email,
      serverName: server.name,
      planName: server.plan.name,
      amount: refundAmount > 0 ? refundAmount : undefined,
      description: refundAmount > 0 ? `Возврат: ${refundAmount} ₽` : undefined,
    })

    return NextResponse.json({ 
      success: true, 
      refundAmount,
      message: refundAmount > 0 ? `Возвращено ${refundAmount} ₽` : 'Сервер удалён'
    })
  } catch (error) {
    console.error('Delete server error:', error)
    return NextResponse.json({ error: 'Ошибка удаления сервера' }, { status: 500 })
  }
}