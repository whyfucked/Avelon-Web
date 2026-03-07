import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { sendDiscordLog } from '@/lib/discord'

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Не авторизованы' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: authUser.id } })
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    const body = await request.json()
    const { serverId } = body

    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: { plan: true, node: true },
    })

    if (!server) {
      return NextResponse.json({ error: 'Сервер не найден' }, { status: 404 })
    }

    if (server.userId !== user.id) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    if (server.plan.isFree) {
      return NextResponse.json({ 
        error: 'Бесплатный тариф нельзя продлить' 
      }, { status: 400 })
    }

    // Полная цена без скидки (план + модификатор ноды)
    const renewalCost = server.plan.price + (server.node?.priceModifier ?? 0)

    if (user.balance < renewalCost) {
      return NextResponse.json({ 
        error: 'Недостаточно средств на балансе',
        required: renewalCost,
        current: user.balance,
      }, { status: 400 })
    }

    const newExpiresAt = new Date(server.expiresAt || new Date())
    newExpiresAt.setDate(newExpiresAt.getDate() + 30)

    // При продлении обновляем paidAmount на полную цену (скидка только при создании)
    await prisma.server.update({
      where: { id: serverId },
      data: { 
        expiresAt: newExpiresAt,
        paidAmount: renewalCost,
      },
    })

    await prisma.user.update({
      where: { id: user.id },
      data: { balance: { decrement: renewalCost } },
    })

    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'PAYMENT',
        amount: -renewalCost,
        description: `Продление сервера "${server.name}" на 30 дней`,
        serverId: server.id,
      },
    })

    // Отправляем лог в Discord
    await sendDiscordLog({
      type: 'RENEWAL',
      userId: user.id,
      userEmail: user.email,
      amount: renewalCost,
      serverName: server.name,
      planName: server.plan.name,
    })

    return NextResponse.json({ 
      success: true,
      message: `Сервер продлён на 30 дней`,
      expiresAt: newExpiresAt,
    })
  } catch (error) {
    console.error('Renew server error:', error)
    return NextResponse.json({ 
      error: 'Ошибка при продлении сервера' 
    }, { status: 500 })
  }
}
