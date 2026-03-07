import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET - получить все StorageBox
export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)

    const boxes = await prisma.storageBox.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(boxes)
  } catch (error) {
    console.error('[Admin StorageBox GET]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST - создать StorageBox для пользователя
export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin(req)

    const body = await req.json()
    const { userId, name, ftpHost, ftpUser, ftpPassword, sizeGB, months = 1, price = 0, expiresAt: customExpiresAt, status = 'UNPAID' } = body

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

    const box = await prisma.storageBox.create({
      data: {
        name,
        userId,
        planId: null,
        ftpHost,
        ftpUser,
        ftpPassword,
        sizeGB,
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
        action: 'STORAGEBOX_CREATE',
        description: `Создан StorageBox "${name}" для ${targetUser.email}`,
        metadata: JSON.stringify({ boxId: box.id, price, months }),
      },
    })

    // Отправка email с данными доступа
    if (status !== 'UNPAID') {
      try {
        const { sendEmail } = await import('@/lib/email')
        await sendEmail({
          to: targetUser.email,
          subject: `Ваш StorageBox ${name} готов`,
          html: `
            <h2>Ваш StorageBox готов к использованию!</h2>
            <p>Здравствуйте, ${targetUser.name || targetUser.email}!</p>
            <p>Ваш StorageBox <strong>${name}</strong> был успешно создан и готов к использованию.</p>
            
            <h3>Данные для подключения:</h3>
            <ul>
              <li><strong>FTP Host:</strong> ${ftpHost || 'Будет предоставлен позже'}</li>
              <li><strong>FTP User:</strong> ${ftpUser || 'Будет предоставлен позже'}</li>
              <li><strong>FTP Password:</strong> ${ftpPassword || 'Будет предоставлен позже'}</li>
              <li><strong>Размер:</strong> ${sizeGB} GB</li>
              <li><strong>Цена:</strong> ${price} ₽</li>
              <li><strong>Дата истечения:</strong> ${expiresAt ? expiresAt.toLocaleDateString('ru-RU') : 'Не указана'}</li>
            </ul>
            
            <p>Вы можете управлять StorageBox в личном кабинете: <a href="${process.env.NEXT_PUBLIC_URL || 'https://yourdomain.ru'}/client/servers">Перейти в панель</a></p>
            
            <p>С уважением,<br>Команда Avelon</p>
          `,
        })
      } catch (emailError) {
        console.error('[StorageBox Email]', emailError)
      }
    }

    return NextResponse.json(box)
  } catch (error) {
    console.error('[Admin StorageBox POST]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PATCH - обновить StorageBox
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAdmin(req)

    const body = await req.json()
    const { boxId, action, ...updateData } = body

    if (!boxId) {
      return NextResponse.json({ error: 'Box ID required' }, { status: 400 })
    }

    const box = await prisma.storageBox.findUnique({
      where: { id: boxId },
      include: { user: true },
    })

    if (!box) {
      return NextResponse.json({ error: 'StorageBox not found' }, { status: 404 })
    }

    let logAction: any = null
    let logDescription = ''

    if (body.status) {
      // Изменение статуса
      await prisma.storageBox.update({
        where: { id: boxId },
        data: { status: body.status as any },
      })
      logAction = 'STORAGEBOX_SUSPEND'
      logDescription = `Изменён статус StorageBox "${box.name}" на "${body.status}"`
    } else if (action === 'suspend') {
      await prisma.storageBox.update({
        where: { id: boxId },
        data: { status: 'SUSPENDED' },
      })
      logAction = 'STORAGEBOX_SUSPEND'
      logDescription = `Приостановлен StorageBox "${box.name}" (${box.user.email})`
    } else if (action === 'unsuspend') {
      await prisma.storageBox.update({
        where: { id: boxId },
        data: { status: 'ACTIVE' },
      })
      logAction = 'STORAGEBOX_UNSUSPEND'
      logDescription = `Возобновлён StorageBox "${box.name}" (${box.user.email})`
    } else {
      await prisma.storageBox.update({
        where: { id: boxId },
        data: updateData,
      })
      logAction = 'STORAGEBOX_SUSPEND'
      logDescription = `Обновлён StorageBox "${box.name}"`
    }

    if (logAction) {
      await prisma.adminLog.create({
        data: {
          adminId: user.id,
          userId: box.userId,
          action: logAction,
          description: logDescription,
          metadata: JSON.stringify({ boxId }),
        },
      })
    }

    const updated = await prisma.storageBox.findUnique({
      where: { id: boxId },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[Admin StorageBox PATCH]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE - удалить StorageBox
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAdmin(req)

    const { searchParams } = new URL(req.url)
    const boxId = searchParams.get('id')

    if (!boxId) {
      return NextResponse.json({ error: 'Box ID required' }, { status: 400 })
    }

    const box = await prisma.storageBox.findUnique({
      where: { id: boxId },
      include: { user: true },
    })

    if (!box) {
      return NextResponse.json({ error: 'StorageBox not found' }, { status: 404 })
    }

    await prisma.storageBox.delete({ where: { id: boxId } })

    await prisma.adminLog.create({
      data: {
        adminId: user.id,
        userId: box.userId,
        action: 'STORAGEBOX_DELETE',
        description: `Удалён StorageBox "${box.name}" (${box.user.email})`,
        metadata: JSON.stringify({ boxId }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin StorageBox DELETE]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
