import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { CrystalPayWebhookPayload, verifyWebhookSignature } from "@/lib/crystalpay"
import { sendDiscordLog } from "@/lib/discord"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CrystalPayWebhookPayload

    console.log("[CrystalPay Webhook] Received:", body)

    const { id, order_id, amount, state, extra, signature } = body

    if (!id || !order_id || !amount || !state || !signature) {
      console.error("[CrystalPay Webhook] Missing required fields")
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    if (!verifyWebhookSignature(body)) {
      console.error("[CrystalPay Webhook] Invalid signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
    }

    // Проверяем, не обработан ли уже этот платёж
    const existingTransaction = await prisma.transaction.findFirst({
      where: { externalId: id, status: "COMPLETED" },
    })

    if (existingTransaction) {
      console.log("[CrystalPay Webhook] Transaction already processed:", id)
      return NextResponse.json({ success: true, message: "Already processed" })
    }

    // Извлекаем userId из order_id или extra
    const orderId = extra || order_id
    const [userId, timestamp, promoId] = orderId.split("_")

    if (!userId) {
      console.error("[CrystalPay Webhook] Missing userId in order_id")
      return NextResponse.json({ error: "Invalid order_id" }, { status: 400 })
    }

    // Обрабатываем успешный платёж
    if (state === "payed") {
      const paymentAmount = parseFloat(amount)

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        console.error("[CrystalPay Webhook] User not found:", userId)
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      let bonus = 0

      // Применяем промокод если есть
      if (promoId && promoId !== "none") {
        const promo = await prisma.promoCode.findUnique({
          where: { id: promoId },
          include: { usages: { where: { userId } } },
        })

        if (promo && promo.isActive && promo.usages.length === 0) {
          // Проверяем лимит использований
          if (promo.maxUses && promo.usedCount >= promo.maxUses) {
            console.log("[CrystalPay Webhook] Promo max uses reached:", promo.code)
          } else {
            if (promo.type === "BALANCE") {
              bonus = promo.value
            } else if (promo.type === "DISCOUNT") {
              bonus = Math.round(paymentAmount * (promo.value / 100))
            }

            await prisma.promoUsage.create({
              data: { promoId: promo.id, userId },
            })

            await prisma.promoCode.update({
              where: { id: promo.id },
              data: { usedCount: { increment: 1 } },
            })
          }
        }
      }

      const totalAmount = paymentAmount + bonus

      // Обновляем баланс пользователя
      await prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: totalAmount } },
      })

      // Обновляем транзакцию
      await prisma.transaction.updateMany({
        where: { externalId: id },
        data: {
          amount: totalAmount,
          status: "COMPLETED",
          description: `CrystalPay платёж: ${id}${bonus > 0 ? ` (бонус: +${bonus} ₽)` : ""}`,
        },
      })

      console.log(`[CrystalPay Webhook] Payment processed successfully for user ${userId}, amount: ${totalAmount}`)

      // Отправляем лог в Discord
      await sendDiscordLog({
        type: 'DEPOSIT',
        userId,
        userEmail: user.email,
        amount: totalAmount,
        method: 'CrystalPay',
        description: bonus > 0 ? `Бонус: +${bonus} ₽` : undefined,
      })

      return NextResponse.json({ success: true })
    }

    // Обрабатываем отменённый платёж
    if (state === "canceled") {
      await prisma.transaction.updateMany({
        where: { externalId: id },
        data: {
          status: "FAILED",
          description: "Платёж отменён",
        },
      })

      console.log(`[CrystalPay Webhook] Payment canceled: ${id}`)
      return NextResponse.json({ success: true })
    }

    // Для других статусов просто возвращаем успех
    console.log(`[CrystalPay Webhook] Payment state: ${state}`)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("[CrystalPay Webhook] Error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
