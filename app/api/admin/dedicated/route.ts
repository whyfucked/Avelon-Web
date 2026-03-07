import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET - получить все дедики
export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)

    const servers = await prisma.dedicatedServer.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(servers)
  } catch (error) {
    console.error('[Admin Dedicated GET]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST - создать дедик для пользователя
export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin(req)

    const body = await req.json()
    const { userId, name, ipAddress, rootPassword, cpu, ram, disk, network, months = 1, price = 0, expiresAt: customExpiresAt, status = 'UNPAID' } = body

    if (!userId || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Используем указанную дату или вычисляем
    let expiresAt: Date | null = null
    if (customExpiresAt) {
      expiresAt = new Date(customExpiresAt)
    } else if (status !== 'UNPAID') {
      expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + months)
    }

    // Создаем specs объект
    const specs = {
      cpu: cpu || 0,
      ram: ram || 0,
      disk: disk || 0,
      network: network || 0,
    }

    const server = await prisma.dedicatedServer.create({
      data: {
        name,
        userId,
        planId: null,
        ipAddress,
        rootPassword,
        specs: JSON.stringify(specs),
        status: status as any,
        expiresAt,
        paidAmount: price > 0 ? price : null, // Сохраняем цену даже для UNPAID
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    })

    await prisma.adminLog.create({
      data: {
        adminId: user.id,
        userId,
        action: 'DEDICATED_CREATE',
        description: `Создан дедик "${name}" для ${targetUser.email}`,
        metadata: JSON.stringify({ serverId: server.id, price, months }),
      },
    })

    // Отправка email с данными доступа
    if (status !== 'UNPAID') {
      try {
        const { sendEmail } = await import('@/lib/email')
        await sendEmail({
          to: targetUser.email,
          subject: `Ваш выделенный сервер ${name} готов`,
          html: `
            <h2>Ваш выделенный сервер готов к использованию!</h2>
            <p>Здравствуйте, ${targetUser.name || targetUser.email}!</p>
            <p>Ваш выделенный сервер <strong>${name}</strong> был успешно создан и готов к использованию.</p>
            
            <h3>Данные для подключения:</h3>
            <ul>
              <li><strong>IP адрес:</strong> ${ipAddress || 'Будет предоставлен позже'}</li>
              <li><strong>Root пароль:</strong> ${rootPassword || 'Будет предоставлен позже'}</li>
              <li><strong>CPU:</strong> ${cpu || 0} ядер</li>
              <li><strong>RAM:</strong> ${ram || 0} GB</li>
              <li><strong>Disk:</strong> ${disk || 0} GB</li>
              <li><strong>Network:</strong> ${network || 0} Mbit/s</li>
              <li><strong>Цена:</strong> ${price} ₽</li>
              <li><strong>Дата истечения:</strong> ${expiresAt ? expiresAt.toLocaleDateString('ru-RU') : 'Не указана'}</li>
            </ul>
            
            <p>Вы можете управлять сервером в личном кабинете: <a href="${process.env.NEXT_PUBLIC_URL || 'https://yourdomain.ru'}/client/servers">Перейти в панель</a></p>
            
            <p>С уважением,<br>Команда Avelon</p>
          `,
        })
      } catch (emailError) {
        console.error('[Dedicated Email]', emailError)
      }
    }

    return NextResponse.json(server)
  } catch (error) {
    console.error('[Admin Dedicated POST]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PATCH - обновить дедик
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAdmin(req)

    const body = await req.json()
    const { serverId, action, status, ...updateData } = body

    if (!serverId) {
      return NextResponse.json({ error: 'Server ID required' }, { status: 400 })
    }

    const server = await prisma.dedicatedServer.findUnique({
      where: { id: serverId },
      include: { user: true },
    })

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    let logAction: any = null
    let logDescription = ''

    if (status) {
      // Изменение статуса
      await prisma.dedicatedServer.update({
        where: { id: serverId },
        data: { status: status as any },
      })
      logAction = 'DEDICATED_SUSPEND'
      logDescription = `Изменён статус дедика "${server.name}" на "${status}"`
    } else if (action === 'suspend') {
      await prisma.dedicatedServer.update({
        where: { id: serverId },
        data: { status: 'SUSPENDED' },
      })
      logAction = 'DEDICATED_SUSPEND'
      logDescription = `Приостановлен дедик "${server.name}" (${server.user.email})`
    } else if (action === 'unsuspend') {
      await prisma.dedicatedServer.update({
        where: { id: serverId },
        data: { status: 'ACTIVE' },
      })
      logAction = 'DEDICATED_UNSUSPEND'
      logDescription = `Возобновлён дедик "${server.name}" (${server.user.email})`
    } else {
      await prisma.dedicatedServer.update({
        where: { id: serverId },
        data: updateData,
      })
      logAction = 'DEDICATED_SUSPEND'
      logDescription = `Обновлён дедик "${server.name}"`
    }

    if (logAction) {
      await prisma.adminLog.create({
        data: {
          adminId: user.id,
          userId: server.userId,
          action: logAction,
          description: logDescription,
          metadata: JSON.stringify({ serverId }),
        },
      })
    }

    const updated = await prisma.dedicatedServer.findUnique({
      where: { id: serverId },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[Admin Dedicated PATCH]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE - удалить дедик
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAdmin(req)

    const { searchParams } = new URL(req.url)
    const serverId = searchParams.get('id')

    if (!serverId) {
      return NextResponse.json({ error: 'Server ID required' }, { status: 400 })
    }

    const server = await prisma.dedicatedServer.findUnique({
      where: { id: serverId },
      include: { user: true },
    })

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    await prisma.dedicatedServer.delete({ where: { id: serverId } })

    await prisma.adminLog.create({
      data: {
        adminId: user.id,
        userId: server.userId,
        action: 'DEDICATED_DELETE',
        description: `Удалён дедик "${server.name}" (${server.user.email})`,
        metadata: JSON.stringify({ serverId }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Dedicated DELETE]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
