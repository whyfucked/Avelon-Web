import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { validateYooMoneyNotification, YooMoneyWebhookPayload } from "@/lib/yoomoney"
import { sendDiscordLog } from "@/lib/discord"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const data: YooMoneyWebhookPayload = {}
    
    for (const [key, value] of formData.entries()) {
      data[key as keyof YooMoneyWebhookPayload] = value.toString()
    }

    console.log("[YooMoney] Webhook received:", data)

    if (!validateYooMoneyNotification(data)) {
      console.error("[YooMoney] Invalid notification signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
    }

    const { label, amount } = data
    if (!label || !amount) {
      console.error("[YooMoney] Missing required fields")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const orderParts = label.split("_")
    if (orderParts.length < 2) {
      console.error("[YooMoney] Invalid order format")
      return NextResponse.json({ error: "Invalid order format" }, { status: 400 })
    }

    const userId = orderParts[0]
    const promoId = orderParts[2] !== "none" ? orderParts[2] : null
    const amountNum = parseFloat(amount)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      console.error("[YooMoney] User not found:", userId)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const existingTransaction = await prisma.transaction.findFirst({
      where: { externalId: label, status: "COMPLETED" }
    })

    if (existingTransaction) {
      console.log("[YooMoney] Transaction already processed:", label)
      return NextResponse.json({ status: "success" }, { status: 200 })
    }

    let bonus = 0
    
    if (promoId) {
      const promo = await prisma.promoCode.findUnique({
        where: { id: promoId },
        include: { usages: { where: { userId } } }
      })

      if (promo && promo.isActive && promo.usages.length === 0) {
        if (promo.maxUses && promo.usedCount >= promo.maxUses) {
          console.log("[YooMoney] Promo max uses reached:", promo.code)
        } else {
          if (promo.type === "BALANCE") {
            bonus = promo.value
          } else if (promo.type === "DISCOUNT") {
            bonus = Math.round(amountNum * (promo.value / 100))
          }

          await prisma.promoUsage.create({
            data: { userId, promoId: promo.id }
          })
          
          await prisma.promoCode.update({
            where: { id: promo.id },
            data: { usedCount: { increment: 1 } },
          })
        }
      }
    }

    const totalAmount = amountNum + bonus

    await prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: totalAmount } }
    })

    await prisma.transaction.updateMany({
      where: { externalId: label, status: "PENDING" },
      data: {
        amount: totalAmount,
        status: "COMPLETED",
        description: `YooMoney платёж: ${label}${bonus > 0 ? ` (бонус: +${bonus} ₽)` : ""}`
      }
    })

    console.log(`[YooMoney] Payment processed successfully for user ${userId}, amount: ${totalAmount}`)
    
    // Отправляем лог в Discord
    await sendDiscordLog({
      type: 'DEPOSIT',
      userId,
      userEmail: user.email,
      amount: totalAmount,
      method: 'YooMoney',
      description: bonus > 0 ? `Бонус: +${bonus} ₽` : undefined,
    })
    
    return NextResponse.json({ status: "success" }, { status: 200 })
  } catch (error) {
    console.error("[YooMoney] Webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}