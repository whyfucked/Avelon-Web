/**
 * Database Transaction Helpers
 * Безопасные транзакции для предотвращения race conditions
 */

import { prisma } from './db'
import { Prisma } from '@prisma/client'

// ============================================================================
// Balance Operations (защита от race conditions)
// ============================================================================

export interface BalanceOperationResult {
  success: boolean
  newBalance: number
  error?: string
}

/**
 * Безопасное списание баланса с проверкой
 * Использует транзакцию для предотвращения race conditions
 */
export async function safeDeductBalance(
  userId: string,
  amount: number,
  description: string
): Promise<BalanceOperationResult> {
  if (amount <= 0) {
    return { success: false, newBalance: 0, error: 'Сумма должна быть положительной' }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true }
      })

      if (!user) {
        throw new Error('Пользователь не найден')
      }

      if (user.balance < amount) {
        throw new Error(`Недостаточно средств. Баланс: ${user.balance} ₽, требуется: ${amount} ₽`)
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: amount } },
        select: { balance: true }
      })

      await tx.transaction.create({
        data: {
          userId,
          type: 'PAYMENT',
          amount: -amount,
          description,
          status: 'COMPLETED'
        }
      })

      return updatedUser.balance
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 10000 // 10 секунд таймаут
    })

    return { success: true, newBalance: result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка транзакции'
    return { success: false, newBalance: 0, error: message }
  }
}

/**
 * Безопасное пополнение баланса
 */
export async function safeAddBalance(
  userId: string,
  amount: number,
  description: string,
  externalId?: string
): Promise<BalanceOperationResult> {
  if (amount <= 0) {
    return { success: false, newBalance: 0, error: 'Сумма должна быть положительной' }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (externalId) {
        const existing = await tx.transaction.findFirst({
          where: { 
            externalId,
            status: 'COMPLETED'
          }
        })
        
        if (existing) {
          throw new Error('Транзакция уже обработана')
        }
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } },
        select: { balance: true }
      })

      await tx.transaction.create({
        data: {
          userId,
          type: 'DEPOSIT',
          amount,
          description,
          status: 'COMPLETED',
          externalId
        }
      })

      return updatedUser.balance
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 10000
    })

    return { success: true, newBalance: result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка транзакции'
    return { success: false, newBalance: 0, error: message }
  }
}

/**
 * Возврат средств (откат транзакции)
 */
export async function safeRefundBalance(
  userId: string,
  amount: number,
  description: string,
  originalTransactionId?: string
): Promise<BalanceOperationResult> {
  if (amount <= 0) {
    return { success: false, newBalance: 0, error: 'Сумма должна быть положительной' }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } },
        select: { balance: true }
      })

      await tx.transaction.create({
        data: {
          userId,
          type: 'REFUND',
          amount,
          description,
          status: 'COMPLETED'
        }
      })

      if (originalTransactionId) {
        await tx.transaction.update({
          where: { id: originalTransactionId },
          data: { status: 'FAILED' }
        })
      }

      return updatedUser.balance
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 10000
    })

    return { success: true, newBalance: result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка возврата'
    return { success: false, newBalance: 0, error: message }
  }
}

// ============================================================================
// Promo Code Operations (защита от race conditions)
// ============================================================================

export interface PromoCodeResult {
  success: boolean
  discount: number
  bonus: number
  error?: string
}

/**
 * Безопасное применение промокода
 */
export async function safeApplyPromoCode(
  userId: string,
  promoCode: string,
  amount: number,
  type: 'balance' | 'server'
): Promise<PromoCodeResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const promo = await tx.promoCode.findUnique({
        where: { code: promoCode.toUpperCase() },
        include: {
          usages: { where: { userId } }
        }
      })

      if (!promo) {
        throw new Error('Промокод не найден')
      }

      if (!promo.isActive) {
        throw new Error('Промокод неактивен')
      }

      if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
        throw new Error('Промокод истёк')
      }

      if (promo.maxUses && promo.usedCount >= promo.maxUses) {
        throw new Error('Промокод исчерпан')
      }

      if (promo.usages.length > 0) {
        throw new Error('Вы уже использовали этот промокод')
      }

      if (type === 'balance' && promo.type !== 'BALANCE') {
        throw new Error('Этот промокод не для пополнения баланса')
      }

      if (type === 'server' && promo.type !== 'DISCOUNT') {
        throw new Error('Этот промокод не для скидки на сервер')
      }

      let discount = 0
      let bonus = 0

      if (promo.type === 'DISCOUNT') {
        discount = Math.round(amount * (promo.value / 100))
      } else if (promo.type === 'BALANCE') {
        bonus = promo.value
      }

      await tx.promoCode.update({
        where: { id: promo.id },
        data: { usedCount: { increment: 1 } }
      })

      await tx.promoUsage.create({
        data: {
          promoId: promo.id,
          userId
        }
      })

      return { discount, bonus }
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 10000
    })

    return { success: true, ...result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка применения промокода'
    return { success: false, discount: 0, bonus: 0, error: message }
  }
}
