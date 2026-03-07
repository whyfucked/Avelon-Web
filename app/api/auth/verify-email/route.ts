import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendVerificationCode, isSmtpConfigured, generateVerificationCode } from '@/lib/email'
import { sendDiscordLog } from '@/lib/discord'
import { checkRateLimit, rateLimitResponse, getClientIp, createAuditLog } from '@/lib/security'
import { createPterodactylUser, findPterodactylUserByEmail } from '@/lib/pterodactyl'

// POST - подтверждение email по коду (создание аккаунта)
export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request)
  
  // Rate limiting: 10 попыток за 15 минут
  const rateLimit = checkRateLimit(`verify-code:${clientIp}`, { 
    maxRequests: 10, 
    windowMs: 15 * 60 * 1000 
  })
  
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt)
  }

  try {
    const body = await request.json()
    const { email, code } = body

    if (!email || !code) {
      return NextResponse.json({ error: 'Email и код обязательны' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Ищем pending регистрацию
    const pending = await prisma.emailVerification.findUnique({
      where: { email: normalizedEmail }
    })

    if (!pending) {
      return NextResponse.json({ error: 'Регистрация не найдена. Начните заново.' }, { status: 400 })
    }

    if (pending.expiresAt < new Date()) {
      await prisma.emailVerification.delete({ where: { id: pending.id } })
      return NextResponse.json({ error: 'Код истёк. Зарегистрируйтесь заново.' }, { status: 400 })
    }

    if (pending.code !== code) {
      return NextResponse.json({ error: 'Неверный код' }, { status: 400 })
    }

    // Проверяем что пользователь не был создан пока мы проверяли
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) {
      await prisma.emailVerification.delete({ where: { id: pending.id } })
      return NextResponse.json({ error: 'Пользователь уже существует' }, { status: 400 })
    }

    // Создаём пользователя
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: pending.password!,
        name: pending.name,
        emailVerified: true,
        pterodactylPassword: pending.plainPassword || undefined, // Сохраняем оригинальный пароль
      },
    })

    // Создаём аккаунт в Pterodactyl
    try {
      const existingPteroUser = await findPterodactylUserByEmail(normalizedEmail)
      if (!existingPteroUser) {
        const username = normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + user.id
        await createPterodactylUser({
          email: normalizedEmail,
          username: username,
          firstName: pending.name || 'User',
          lastName: String(user.id),
          password: pending.plainPassword || undefined, // Используем оригинальный пароль
        })
        console.log('[VerifyEmail] Pterodactyl user created for:', normalizedEmail)
      }
    } catch (pteroError) {
      console.error('[VerifyEmail] Failed to create Pterodactyl user:', pteroError)
      // Не блокируем регистрацию, если Pterodactyl недоступен
    }

    // Удаляем pending регистрацию
    await prisma.emailVerification.delete({ where: { id: pending.id } })

    createAuditLog(request, 'REGISTER_SUCCESS', { userId: user.id, success: true })

    // Отправляем лог в Discord
    await sendDiscordLog({
      type: 'REGISTER',
      userId: user.id,
      userEmail: user.email,
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Аккаунт создан',
      user: { id: user.id, email: user.email, name: user.name },
    })
  } catch (error) {
    console.error('[VerifyEmail] Error:', error)
    return NextResponse.json({ error: 'Ошибка подтверждения' }, { status: 500 })
  }
}

// PUT - повторная отправка кода
export async function PUT(request: NextRequest) {
  const clientIp = getClientIp(request)
  
  // Rate limiting: 3 запроса за 5 минут
  const rateLimit = checkRateLimit(`resend-code:${clientIp}`, { 
    maxRequests: 3, 
    windowMs: 5 * 60 * 1000 
  })
  
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt)
  }

  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email обязателен' }, { status: 400 })
    }

    const smtpConfigured = await isSmtpConfigured()
    if (!smtpConfigured) {
      return NextResponse.json({ error: 'Отправка email не настроена' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Ищем pending регистрацию
    const pending = await prisma.emailVerification.findUnique({
      where: { email: normalizedEmail }
    })

    if (!pending) {
      return NextResponse.json({ error: 'Регистрация не найдена. Начните заново.' }, { status: 400 })
    }

    // Генерируем новый код
    const code = generateVerificationCode()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    await prisma.emailVerification.update({
      where: { id: pending.id },
      data: { code, expiresAt },
    })

    const sent = await sendVerificationCode(normalizedEmail, code)

    if (!sent) {
      return NextResponse.json({ error: 'Ошибка отправки кода' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Код отправлен' })
  } catch (error) {
    console.error('[ResendCode] Error:', error)
    return NextResponse.json({ error: 'Ошибка отправки' }, { status: 500 })
  }
}
