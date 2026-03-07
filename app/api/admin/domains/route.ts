import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET - получить все домены
export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)

    const domains = await prisma.domain.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(domains)
  } catch (error) {
    console.error('[Admin Domains GET]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST - создать домен для пользователя
export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin(req)

    const body = await req.json()
    const { userId, name, registrar, nameservers, months = 12, price = 0, expiresAt: customExpiresAt, status = 'UNPAID' } = body

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

    const domain = await prisma.domain.create({
      data: {
        name,
        userId,
        planId: null,
        registrar,
        nameservers: nameservers ? JSON.stringify(nameservers) : null,
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
        action: 'DOMAIN_CREATE',
        description: `Создан домен "${name}" для ${targetUser.email}`,
        metadata: JSON.stringify({ domainId: domain.id, price, months }),
      },
    })

    // Отправка email с данными доступа
    if (status !== 'UNPAID') {
      try {
        const { sendEmail } = await import('@/lib/email')
        await sendEmail({
          to: targetUser.email,
          subject: `Ваш домен ${name} зарегистрирован`,
          html: `
            <h2>Ваш домен успешно зарегистрирован!</h2>
            <p>Здравствуйте, ${targetUser.name || targetUser.email}!</p>
            <p>Ваш домен <strong>${name}</strong> был успешно зарегистрирован и готов к использованию.</p>
            
            <h3>Информация о домене:</h3>
            <ul>
              <li><strong>Доменное имя:</strong> ${name}</li>
              <li><strong>Регистратор:</strong> ${registrar || 'Не указан'}</li>
              <li><strong>Цена:</strong> ${price} ₽</li>
              <li><strong>Дата истечения:</strong> ${expiresAt ? expiresAt.toLocaleDateString('ru-RU') : 'Не указана'}</li>
            </ul>
            
            <p>Вы можете управлять доменом в личном кабинете: <a href="${process.env.NEXT_PUBLIC_URL || 'https://yourdomain.ru'}/client/servers">Перейти в панель</a></p>
            
            <p>С уважением,<br>Команда Avelon</p>
          `,
        })
      } catch (emailError) {
        console.error('[Domain Email]', emailError)
      }
    }

    return NextResponse.json(domain)
  } catch (error) {
    console.error('[Admin Domains POST]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PATCH - обновить домен
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAdmin(req)

    const body = await req.json()
    const { domainId, action, ...updateData } = body

    if (!domainId) {
      return NextResponse.json({ error: 'Domain ID required' }, { status: 400 })
    }

    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
      include: { user: true },
    })

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    let logAction: any = null
    let logDescription = ''

    if (body.status) {
      // Изменение статуса
      await prisma.domain.update({
        where: { id: domainId },
        data: { status: body.status as any },
      })
      logAction = 'DOMAIN_SUSPEND'
      logDescription = `Изменён статус домена "${domain.name}" на "${body.status}"`
    } else if (action === 'suspend') {
      await prisma.domain.update({
        where: { id: domainId },
        data: { status: 'SUSPENDED' },
      })
      logAction = 'DOMAIN_SUSPEND'
      logDescription = `Приостановлен домен "${domain.name}" (${domain.user.email})`
    } else if (action === 'unsuspend') {
      await prisma.domain.update({
        where: { id: domainId },
        data: { status: 'ACTIVE' },
      })
      logAction = 'DOMAIN_UNSUSPEND'
      logDescription = `Возобновлён домен "${domain.name}" (${domain.user.email})`
    } else {
      await prisma.domain.update({
        where: { id: domainId },
        data: updateData,
      })
      logAction = 'DOMAIN_SUSPEND'
      logDescription = `Обновлён домен "${domain.name}"`
    }

    if (logAction) {
      await prisma.adminLog.create({
        data: {
          adminId: user.id,
          userId: domain.userId,
          action: logAction,
          description: logDescription,
          metadata: JSON.stringify({ domainId }),
        },
      })
    }

    const updated = await prisma.domain.findUnique({
      where: { id: domainId },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[Admin Domains PATCH]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE - удалить домен
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAdmin(req)

    const { searchParams } = new URL(req.url)
    const domainId = searchParams.get('id')

    if (!domainId) {
      return NextResponse.json({ error: 'Domain ID required' }, { status: 400 })
    }

    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
      include: { user: true },
    })

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    await prisma.domain.delete({ where: { id: domainId } })

    await prisma.adminLog.create({
      data: {
        adminId: user.id,
        userId: domain.userId,
        action: 'DOMAIN_DELETE',
        description: `Удалён домен "${domain.name}" (${domain.user.email})`,
        metadata: JSON.stringify({ domainId }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Domains DELETE]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
