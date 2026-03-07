import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
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
    const { code, amount } = body

    if (!code) {
      return NextResponse.json({ error: "Введите промокод" }, { status: 400 })
    }

    const promo = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        usages: {
          where: { userId },
        },
      },
    })

    if (!promo) {
      return NextResponse.json({ error: "Промокод не найден" }, { status: 404 })
    }

    if (!promo.isActive) {
      return NextResponse.json({ error: "Промокод неактивен" }, { status: 400 })
    }

    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Промокод истёк" }, { status: 400 })
    }

    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      return NextResponse.json({ error: "Промокод исчерпан" }, { status: 400 })
    }

    if (promo.usages.length > 0) {
      return NextResponse.json({ error: "Вы уже использовали этот промокод" }, { status: 400 })
    }

    if (promo.type !== "BALANCE") {
      return NextResponse.json({ error: "Этот промокод для скидки на сервер" }, { status: 400 })
    }

    if (promo.minAmount && amount < promo.minAmount) {
      return NextResponse.json({ error: `Минимальная сумма: ${promo.minAmount} ₽` }, { status: 400 })
    }

    const bonus = promo.value
    const message = `+${promo.value} ₽ к пополнению`

    return NextResponse.json({
      valid: true,
      bonus,
      message,
      promoId: promo.id,
    })
  } catch (error) {
    console.error("Check promo error:", error)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
