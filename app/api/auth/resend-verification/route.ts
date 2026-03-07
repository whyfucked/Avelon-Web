import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { sendVerificationCode, generateVerificationCode, isSmtpConfigured } from '@/lib/email'
import { checkRateLimit, rateLimitResponse, getClientIp } from '@/lib/security'

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request)
  
  // Rate limiting: 3 запроса за 1 час
  const rateLimit = checkRateLimit(`resend-verification:${clientIp}`, { 
    maxRequests: 3, 
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

    const smtpConfigured = await isSmtpConfigured()
    if (!smtpConfigured) {
      return NextResponse.json({ error: 'Email сервис недоступен. Обратитесь в поддержку.' }, { status: 503 })
    }

    // Генерируем новый код
    const code = generateVerificationCode()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 минут

    // Удаляем старые коды
    await prisma.emailVerification.deleteMany({ where: { email: user.email } })

    // Создаём новый код
    await prisma.emailVerification.create({
      data: {
        email: user.email,
        code,
        expiresAt,
      },
    })

    // Отправляем код
    const sent = await sendVerificationCode(user.email, code)

    if (!sent) {
      await prisma.emailVerification.deleteMany({ where: { email: user.email } })
      return NextResponse.json({ error: 'Ошибка отправки кода. Попробуйте позже.' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Код отправлен на вашу почту'
    })
  } catch (error) {
    console.error('[Resend Verification] Error:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
