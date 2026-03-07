import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { isAuthEnabled } from '@/lib/auth'
import { checkRateLimit, rateLimitResponse, getClientIp, createAuditLog } from '@/lib/security'
import { adminLogger } from '@/lib/admin-logger'

const JWT_SECRET = process.env.JWT_SECRET

export async function POST(request: NextRequest) {
  if (!JWT_SECRET) {
    console.error('JWT_SECRET not configured')
    return NextResponse.json({ error: 'Ошибка конфигурации сервера' }, { status: 500 })
  }
  
  const clientIp = getClientIp(request)
  
  // Rate limiting: 6 попыток за 15 минут
  const rateLimit = checkRateLimit(`login:${clientIp}`, { 
    maxRequests: 6, 
    windowMs: 15 * 60 * 1000 
  })
  
  if (!rateLimit.allowed) {
    createAuditLog(request, 'LOGIN_RATE_LIMITED', { success: false })
    return rateLimitResponse(rateLimit.resetAt)
  }

  try {
    const enabled = await isAuthEnabled()
    if (!enabled) {
      return NextResponse.json({ error: 'Авторизация отключена администратором' }, { status: 403 })
    }

    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email и пароль обязательны' }, { status: 400 })
    }

    // Валидация email
    if (typeof email !== 'string' || email.length > 255) {
      return NextResponse.json({ error: 'Некорректный email' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    
    if (!user) {
      createAuditLog(request, 'LOGIN_FAILED', { 
        details: { reason: 'user_not_found' },
        success: false 
      })
      // Используем одинаковое сообщение для защиты от перечисления
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 })
    }

    const isValid = await bcrypt.compare(password, user.password)
    
    if (!isValid) {
      createAuditLog(request, 'LOGIN_FAILED', { 
        userId: user.id,
        details: { reason: 'invalid_password' },
        success: false 
      })
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 })
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    createAuditLog(request, 'LOGIN_SUCCESS', { 
      userId: user.id,
      success: true 
    })

    // Логирование для админки
    const userAgent = request.headers.get('user-agent') || 'unknown'
    if (user.role === 'ADMIN') {
      await adminLogger.adminLogin(user.id, clientIp, userAgent)
    } else {
      await adminLogger.userLogin(user.id, clientIp, userAgent)
    }

    const response = NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        balance: user.balance,
        role: user.role,
      },
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // Изменено с 'lax' на 'strict' для защиты от CSRF
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })

    return response
  } catch (error) {
    console.error('[Login] Error:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Ошибка авторизации' }, { status: 500 })
  }
}
