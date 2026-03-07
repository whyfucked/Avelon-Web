import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createPayment } from "@/lib/heleket"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://yourdomain.ru"

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
    const { amount, currency = "USDT", network = "TRON", promoCode } = body

    // Минимум 20 рублей ≈ 0.22 USDT при курсе 90
    const minUsdAmount = 0.22
    
    if (!amount || typeof amount !== "number" || amount < minUsdAmount) {
      return NextResponse.json({ error: "Минимальная сумма: 20 ₽ (~0.22 USDT)" }, { status: 400 })
    }

    if (amount > 10000) {
      return NextResponse.json({ error: "Максимальная сумма: 10 000 USDT" }, { status: 400 })
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
          bonus = Math.round(amount * 90 * (promo.value / 100))
        }
        promoId = promo.id
      }
    }

    const orderId = `${userId}_${Date.now()}_${promoId || "none"}`

    const payment = await createPayment({
      amount,
      currency: "USD",
      orderId,
      callbackUrl: `${APP_URL}/api/heleket/webhook`,
      returnUrl: `${APP_URL}/payments/success?provider=heleket`,
      lifetime: 7200,
      isPaymentMultiple: true,
    })

    if (!payment.url) {
      return NextResponse.json({ error: "Ошибка создания платежа" }, { status: 500 })
    }

    await prisma.transaction.create({
      data: {
        userId,
        type: "DEPOSIT",
        amount: 0,
        description: `Heleket платёж: ${payment.uuid}`,
        status: "PENDING",
        externalId: payment.uuid,
      },
    })

    return NextResponse.json({
      paymentUrl: payment.url,
      invoiceId: payment.uuid,
      amount,
      currency,
      bonus,
    })
  } catch (error) {
    console.error("Heleket create payment error:", error)
    const message = error instanceof Error ? error.message : "Ошибка сервера"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
