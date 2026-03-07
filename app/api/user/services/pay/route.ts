import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// POST - оплатить неоплаченный сервис
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const body = await req.json()
    const { serviceId, serviceType, months = 1 } = body

    if (!serviceId || !serviceType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let service: any = null
    let plan: any = null
    let transactionType: any = null
    let updateModel: any = null

    // Определяем тип сервиса и загружаем данные
    switch (serviceType) {
      case 'dedicated':
        service = await prisma.dedicatedServer.findUnique({
          where: { id: serviceId },
          include: { plan: true },
        })
        transactionType = 'DEDICATED_PAYMENT'
        updateModel = prisma.dedicatedServer
        break
      case 'domain':
        service = await prisma.domain.findUnique({
          where: { id: serviceId },
          include: { plan: true },
        })
        transactionType = 'DOMAIN_PAYMENT'
        updateModel = prisma.domain
        break
      case 'storagebox':
        service = await prisma.storageBox.findUnique({
          where: { id: serviceId },
          include: { plan: true },
        })
        transactionType = 'STORAGEBOX_PAYMENT'
        updateModel = prisma.storageBox
        break
      case 'vds':
        service = await prisma.vdsServer.findUnique({
          where: { id: serviceId },
          include: { plan: true },
        })
        transactionType = 'VDS_PAYMENT'
        updateModel = prisma.vdsServer
        break
      default:
        return NextResponse.json({ error: 'Invalid service type' }, { status: 400 })
    }

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    if (service.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (service.status !== 'UNPAID') {
      return NextResponse.json({ error: 'Service already paid' }, { status: 400 })
    }

    // Определяем цену: либо из плана, либо из paidAmount (для ручных сервисов)
    plan = service.plan
    const paymentCost = plan ? (plan.price * months) : (service.paidAmount || 0)

    if (paymentCost <= 0) {
      return NextResponse.json({ error: 'Invalid service price' }, { status: 400 })
    }

    // Проверяем баланс
    const currentUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!currentUser || currentUser.balance < paymentCost) {
      return NextResponse.json({ 
        error: 'Insufficient balance',
        required: paymentCost,
        current: currentUser?.balance || 0,
      }, { status: 400 })
    }

    // Вычисляем дату истечения
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + months)

    // Обновляем сервис и баланс в транзакции
    await prisma.$transaction([
      // Списываем деньги
      prisma.user.update({
        where: { id: user.id },
        data: { balance: { decrement: paymentCost } },
      }),
      // Обновляем статус и дату истечения
      updateModel.update({
        where: { id: serviceId },
        data: {
          status: 'INSTALLING',
          expiresAt,
          paidAmount: paymentCost,
        },
      }),
      // Создаём транзакцию
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: transactionType,
          amount: -paymentCost,
          description: `Оплата ${serviceType} "${service.name}" на ${months} мес.`,
          serverId: serviceId,
          status: 'COMPLETED',
          method: 'MANUAL',
        },
      }),
    ])

    // Отправляем email с подтверждением оплаты
    try {
      const { sendServicePaymentConfirmationEmail } = await import('@/lib/email')
      await sendServicePaymentConfirmationEmail(currentUser.email, {
        userName: currentUser.name || currentUser.email,
        serviceName: service.name,
        amount: paymentCost,
        period: months,
        expiresAt,
        serviceType,
      })
    } catch (emailError) {
      console.error('[Service Payment Email]', emailError)
    }

    return NextResponse.json({
      success: true,
      expiresAt,
      cost: paymentCost,
      newBalance: currentUser.balance - paymentCost,
      status: 'INSTALLING',
    })
  } catch (error) {
    console.error('[Service Pay]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
