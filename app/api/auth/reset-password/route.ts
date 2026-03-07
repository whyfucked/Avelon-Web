import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

// GET - проверка токена
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ valid: false })
  }

  try {
    const reset = await prisma.passwordReset.findUnique({
      where: { token }
    })

    if (!reset || reset.expiresAt < new Date()) {
      return NextResponse.json({ valid: false })
    }

    return NextResponse.json({ valid: true })
  } catch {
    return NextResponse.json({ valid: false })
  }
}

// POST - сброс пароля
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json({ error: 'Токен и пароль обязательны' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Пароль должен быть минимум 6 символов' }, { status: 400 })
    }

    const reset = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!reset || reset.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Ссылка истекла или недействительна' }, { status: 400 })
    }

    // Хешируем новый пароль
    const hashedPassword = await bcrypt.hash(password, 10)

    // Обновляем пароль
    await prisma.user.update({
      where: { id: reset.userId },
      data: { password: hashedPassword }
    })

    // Удаляем токен
    await prisma.passwordReset.delete({
      where: { id: reset.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Ошибка сброса пароля' }, { status: 500 })
  }
}
