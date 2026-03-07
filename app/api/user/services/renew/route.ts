import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// POST - продлить сервис (дедик, домен, StorageBox, VDS)
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
        transactionType = 'DEDICATED_RENEWAL'
        updateModel = prisma.dedicatedServer
        break
      case 'domain':
        service = await prisma.domain.findUnique({
          where: { id: serviceId },
          include: { plan: true },
        })
        transactionType = 'DOMAIN_RENEWAL'
        updateModel = prisma.domain
        break
      case 'storagebox':
        service = await prisma.storageBox.findUnique({
          where: { id: serviceId },
          include: { plan: true },
        })
        transactionType = 'STORAGEBOX_RENEWAL'
        updateModel = prisma.storageBox
        break
      case 'vds':
        service = await prisma.vdsServer.findUnique({
          where: { id: serviceId },
          include: { plan: true },
        })
        transactionType = 'VDS_RENEWAL'
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

    // Определяем цену: либо из плана, либо из paidAmount (для ручных сервисов)
    plan = service.plan
    const renewalCost = plan ? (plan.price * months) : (service.paidAmount || 0)

    if (renewalCost <= 0) {
      return NextResponse.json({ error: 'Invalid service price' }, { status: 400 })
    }

    // Проверяем баланс
    const currentUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!currentUser || currentUser.balance < renewalCost) {
      return NextResponse.json({ 
        error: 'Insufficient balance',
        required: renewalCost,
        current: currentUser?.balance || 0,
      }, { status: 400 })
    }

    // Вычисляем новую дату истечения
    const currentExpiry = service.expiresAt ? new Date(service.expiresAt) : new Date()
    const now = new Date()
    const baseDate = currentExpiry > now ? currentExpiry : now
    
    const newExpiry = new Date(baseDate)
    newExpiry.setMonth(newExpiry.getMonth() + months)

    // Обновляем сервис и баланс в транзакции
    await prisma.$transaction([
      // Списываем деньги
      prisma.user.update({
        where: { id: user.id },
        data: { balance: { decrement: renewalCost } },
      }),
      // Обновляем дату истечения и статус
      updateModel.update({
        where: { id: serviceId },
        data: {
          expiresAt: newExpiry,
          gracePeriodEnd: null,
          status: 'ACTIVE',
        },
      }),
      // Создаём транзакцию
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: transactionType,
          amount: -renewalCost,
          description: `Продление ${serviceType} "${service.name}" на ${months} мес.`,
          serverId: serviceId,
          status: 'COMPLETED',
          method: 'MANUAL',
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      newExpiry,
      cost: renewalCost,
      newBalance: currentUser.balance - renewalCost,
    })
  } catch (error) {
    console.error('[Service Renew]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
