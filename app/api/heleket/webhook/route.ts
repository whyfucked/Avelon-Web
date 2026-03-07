import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { HeleketWebhookPayload, verifyWebhookSign } from "@/lib/heleket"
import { sendDiscordLog } from "@/lib/discord"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as HeleketWebhookPayload

    const { uuid, order_id, amount, currency, status, is_final, sign } = body

    console.log("[Heleket Webhook] Received:", { uuid, order_id, amount, currency, status, is_final })

    if (!uuid || !order_id || !status || !sign) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    if (!verifyWebhookSign(body)) {
      console.error("[Heleket Webhook] Invalid signature")
      return NextResponse.json({ error: "Hash Verification Failure" }, { status: 403 })
    }

    const existingTransaction = await prisma.transaction.findFirst({
      where: { externalId: uuid, status: "COMPLETED" },
    })

    if (existingTransaction) {
      return NextResponse.json({ success: true, message: "Already processed" })
    }

    const orderIdClean = order_id.replace(/^whmcs(?:_upd)?_/, "")
    const [userId, timestamp, promoId] = orderIdClean.split("_")

    if (!userId) {
      console.error("[Heleket Webhook] Missing userId in order_id")
      return NextResponse.json({ error: "Invalid order_id" }, { status: 400 })
    }

    const isPaid = is_final && (status === "paid" || status === "paid_over" || status === "wrong_amount")

    if (isPaid) {
      const paymentAmount = parseFloat(amount)

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        console.error("[Heleket Webhook] User not found:", userId)
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      let bonus = 0

      if (promoId && promoId !== "none") {
        const promo = await prisma.promoCode.findUnique({
          where: { id: promoId },
          include: { usages: { where: { userId } } },
        })

        if (promo && promo.isActive && promo.usages.length === 0) {
          // Проверяем лимит использований
          if (promo.maxUses && promo.usedCount >= promo.maxUses) {
            console.log("[Heleket Webhook] Promo max uses reached:", promo.code)
          } else {
            if (promo.type === "BALANCE") {
              bonus = promo.value
            } else if (promo.type === "DISCOUNT") {
              bonus = Math.round(paymentAmount * 90 * (promo.value / 100))
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

      const rubAmount = Math.round(paymentAmount * 90)
      const totalAmount = rubAmount + bonus

      await prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: totalAmount } },
      })

      await prisma.transaction.updateMany({
        where: { externalId: uuid },
        data: {
          amount: totalAmount,
          status: "COMPLETED",
          description: bonus > 0
            ? `Heleket: ${paymentAmount} ${currency} (${rubAmount} ₽) + бонус ${bonus} ₽`
            : `Heleket: ${paymentAmount} ${currency} (${rubAmount} ₽)`,
        },
      })

      console.log(`[Heleket Webhook] Payment succeeded: ${uuid}, user: ${userId}, amount: ${totalAmount} ₽`)
      
      // Отправляем лог в Discord
      await sendDiscordLog({
        type: 'DEPOSIT',
        userId,
        userEmail: user.email,
        amount: totalAmount,
        method: 'Heleket (Crypto)',
        description: bonus > 0 ? `Бонус: +${bonus} ₽` : undefined,
      })
    }

    if (status === "fail" || status === "cancel" || status === "system_fail") {
      await prisma.transaction.updateMany({
        where: { externalId: uuid },
        data: {
          status: "FAILED",
          description: "Платёж отменён",
        },
      })

      console.log(`[Heleket Webhook] Payment failed: ${uuid}, status: ${status}`)
    }

    if (status === "refund_paid") {
      await prisma.transaction.updateMany({
        where: { externalId: uuid },
        data: {
          status: "FAILED",
          description: "Платёж возвращён",
        },
      })

      console.log(`[Heleket Webhook] Payment refunded: ${uuid}`)
    }

    return new NextResponse("OK", { status: 200 })
  } catch (error) {
    console.error("[Heleket Webhook] Error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
