import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createYooMoneyPayment } from "@/lib/yoomoney"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    let userId: string
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
      userId = decoded.userId
    } catch {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const body = await request.json()
    const { amount, promoCode } = body

    if (!amount || typeof amount !== "number" || amount < 10) {
      return NextResponse.json({ error: "Минимальная сумма: 10 ₽" }, { status: 400 })
    }

    if (amount > 60000) {
      return NextResponse.json({ error: "Максимальная сумма: 60 000 ₽" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    // Проверка верификации email для пользователей с нестандартными доменами
    if (!user.emailVerified) {
      return NextResponse.json({ 
        error: 'Для пополнения баланса необходимо подтвердить email. Проверьте почту или обратитесь в поддержку.',
        needsVerification: true
      }, { status: 403 })
    }

    let bonus = 0
    let promoId: string | null = null

    if (promoCode) {
      const promo = await prisma.promoCode.findUnique({
        where: { code: promoCode.toUpperCase() },
        include: {
          usages: { where: { userId } },
        },
      })

      if (promo && promo.isActive && promo.usages.length === 0) {
        if (promo.type === "BALANCE") {
          bonus = promo.value
        } else if (promo.type === "DISCOUNT") {
          bonus = Math.round(amount * (promo.value / 100))
        }
        promoId = promo.id
      }
    }

    const orderId = `${userId}_${Date.now()}_${promoId || "none"}`
    const comment = "Пополнение баланса"

    const payment = createYooMoneyPayment(amount, comment, orderId)

    if (!payment.url) {
      return NextResponse.json({ error: "Ошибка создания платежа" }, { status: 500 })
    }

    await prisma.transaction.create({
      data: {
        userId,
        type: "DEPOSIT",
        amount: 0,
        description: `YooMoney платёж: ${orderId}`,
        status: "PENDING",
        externalId: orderId,
      },
    })

    return NextResponse.json({
      paymentUrl: payment.url,
      orderId,
      amount,
      bonus,
    })
  } catch (error) {
    console.error("YooMoney create payment error:", error)
    const message = error instanceof Error ? error.message : "Ошибка сервера"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}