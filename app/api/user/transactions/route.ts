import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function GET(request: NextRequest) {
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

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error("Get transactions error:", error)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
