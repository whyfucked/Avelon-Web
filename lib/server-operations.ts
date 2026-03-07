/**
 * Server Operations
 * Безопасные операции с серверами
 */

import { prisma } from './db'
import { Prisma } from '@prisma/client'

/**
 * Безопасное создание сервера с транзакцией
 * Предотвращает race conditions при списании баланса
 */
export async function safeCreateServerTransaction(
  userId: string,
  totalPrice: number,
  serverData: {
    name: string
    planId: string
    nodeId: string
    eggId: string
    pterodactylId: number
    pterodactylUuid: string
    pterodactylIdentifier: string
  },
  discount: number = 0,
  promoId?: string | null
): Promise<{ success: boolean; serverId?: string; error?: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true }
      })

      if (!user) {
        throw new Error('Пользователь не найден')
      }

      if (user.balance < totalPrice) {
        throw new Error(`Недостаточно средств. Баланс: ${user.balance} ₽, требуется: ${totalPrice} ₽`)
      }

      const server = await tx.server.create({
        data: {
          name: serverData.name,
          userId,
          planId: serverData.planId,
          nodeId: serverData.nodeId,
          eggId: serverData.eggId,
          pterodactylId: serverData.pterodactylId,
          pterodactylUuid: serverData.pterodactylUuid,
          pterodactylIdentifier: serverData.pterodactylIdentifier,
          status: 'INSTALLING',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          paidAmount: totalPrice,
        },
      })

      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: totalPrice } },
      })

      await tx.transaction.create({
        data: {
          userId,
          type: 'PAYMENT',
          amount: -totalPrice,
          description: discount > 0 
            ? `Сервер "${serverData.name}" (скидка ${discount} ₽)`
            : `Сервер "${serverData.name}"`,
          serverId: server.id,
          status: 'COMPLETED'
        },
      })

      if (promoId) {
        await tx.promoUsage.create({
          data: {
            userId,
            promoId,
          },
        })
        
        await tx.promoCode.update({
          where: { id: promoId },
          data: { usedCount: { increment: 1 } },
        })
      }

      return server.id
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 30000
    })

    return { success: true, serverId: result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка создания сервера'
    return { success: false, error: message }
  }
}

/**
 * Безопасное продление сервера
 */
export async function safeRenewServerTransaction(
  userId: string,
  serverId: string,
  renewalCost: number
): Promise<{ success: boolean; newExpiresAt?: Date; error?: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const server = await tx.server.findUnique({
        where: { id: serverId },
        include: { plan: true }
      })

      if (!server) {
        throw new Error('Сервер не найден')
      }

      if (server.userId !== userId) {
        throw new Error('Нет доступа к серверу')
      }

      if (server.plan.isFree) {
        throw new Error('Бесплатный тариф нельзя продлить')
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true }
      })

      if (!user) {
        throw new Error('Пользователь не найден')
      }

      if (user.balance < renewalCost) {
        throw new Error(`Недостаточно средств. Баланс: ${user.balance} ₽, требуется: ${renewalCost} ₽`)
      }

      const newExpiresAt = new Date(server.expiresAt || new Date())
      newExpiresAt.setDate(newExpiresAt.getDate() + 30)

      await tx.server.update({
        where: { id: serverId },
        data: { 
          expiresAt: newExpiresAt,
          paidAmount: renewalCost,
        },
      })

      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: renewalCost } },
      })

      await tx.transaction.create({
        data: {
          userId,
          type: 'PAYMENT',
          amount: -renewalCost,
          description: `Продление сервера "${server.name}"`,
          serverId,
          status: 'COMPLETED'
        },
      })

      return newExpiresAt
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 10000
    })

    return { success: true, newExpiresAt: result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка продления'
    return { success: false, error: message }
  }
}

/**
 * Безопасное удаление сервера с возвратом средств
 */
export async function safeDeleteServerTransaction(
  userId: string,
  serverId: string,
  isAdmin: boolean = false
): Promise<{ success: boolean; refundAmount?: number; error?: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const server = await tx.server.findUnique({
        where: { id: serverId },
        include: { plan: true, node: true }
      })

      if (!server) {
        throw new Error('Сервер не найден')
      }

      if (!isAdmin && server.userId !== userId) {
        throw new Error('Нет доступа к серверу')
      }

      let refundAmount = 0
      if (server.expiresAt && server.paidAmount) {
        const now = new Date()
        const expiresAt = new Date(server.expiresAt)
        
        if (expiresAt > now) {
          const totalDays = 30
          const remainingMs = expiresAt.getTime() - now.getTime()
          const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000))
          
          if (remainingDays > 0) {
            refundAmount = Math.floor((server.paidAmount / totalDays) * remainingDays)
          }
        }
      }

      await tx.server.update({
        where: { id: serverId },
        data: { status: 'DELETED' },
      })

      if (refundAmount > 0) {
        await tx.user.update({
          where: { id: server.userId },
          data: { balance: { increment: refundAmount } },
        })

        await tx.transaction.create({
          data: {
            userId: server.userId,
            type: 'REFUND',
            amount: refundAmount,
            description: `Возврат за сервер "${server.name}"`,
            serverId,
            status: 'COMPLETED'
          },
        })
      }

      return refundAmount
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 10000
    })

    return { success: true, refundAmount: result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка удаления'
    return { success: false, error: message }
  }
}
