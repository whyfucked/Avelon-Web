import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { checkRateLimit, rateLimitResponse, getClientIp } from '@/lib/security'

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request)
  
  // Rate limiting: 10 попыток за 1 час
  const rateLimit = checkRateLimit(`verify-account:${clientIp}`, { 
    maxRequests: 10, 
    windowMs: 60 * 60 * 1000 
  })
  
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt)
  }

  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: 'Email уже подтверждён' }, { status: 400 })
    }

    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Код обязателен' }, { status: 400 })
    }

    // Ищем код верификации
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email: user.email,
        code: code.trim(),
      },
    })

    if (!verification) {
      return NextResponse.json({ error: 'Неверный код' }, { status: 400 })
    }

    if (new Date() > verification.expiresAt) {
      await prisma.emailVerification.delete({ where: { id: verification.id } })
      return NextResponse.json({ error: 'Код истёк. Запросите новый.' }, { status: 400 })
    }

    // Подтверждаем email
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    })

    // Удаляем использованный код
    await prisma.emailVerification.delete({ where: { id: verification.id } })

    console.log(`[Verify Account] Email verified for user: ${user.email}`)

    return NextResponse.json({ 
      success: true,
      message: 'Email успешно подтверждён!'
    })
  } catch (error) {
    console.error('[Verify Account] Error:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
