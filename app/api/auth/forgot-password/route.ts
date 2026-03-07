import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import nodemailer from 'nodemailer'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email обязателен' }, { status: 400 })
    }

    // Проверяем существует ли пользователь
    const user = await prisma.user.findUnique({
      where: { email }
    })

    // Всегда возвращаем успех для безопасности
    if (!user) {
      return NextResponse.json({ success: true })
    }

    // Генерируем токен
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3600000) // 1 час

    // Сохраняем токен
    await prisma.passwordReset.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        token,
        expiresAt: expires,
      },
      update: {
        token,
        expiresAt: expires,
      },
    })

    // Получаем SMTP настройки
    const smtpSettings = await prisma.adminSettings.findMany({
      where: { key: { startsWith: 'smtp_' } }
    })

    const smtp: Record<string, string> = {}
    smtpSettings.forEach(s => {
      smtp[s.key.replace('smtp_', '')] = s.value
    })

    if (!smtp.host || !smtp.user || !smtp.password) {
      console.error('SMTP not configured')
      return NextResponse.json({ success: true })
    }

    // Отправляем письмо
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: parseInt(smtp.port || '587'),
      secure: smtp.secure === 'true',
      auth: {
        user: smtp.user,
        pass: smtp.password,
      },
    })

    const resetUrl = `${process.env.NEXT_PUBLIC_URL || 'https://yourdomain.ru'}/reset-password?token=${token}`

    await transporter.sendMail({
      from: smtp.from || smtp.user,
      to: email,
      subject: 'Восстановление пароля — Avelon',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background: linear-gradient(145deg, #141414 0%, #1a1a1a 100%); border-radius: 16px; border: 1px solid #262626; overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #262626;">
                      <div style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                        Avelon
                      </div>
                      <div style="font-size: 12px; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Хостинг</div>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 32px;">
                      <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #ffffff;">Сброс пароля</h1>
                      <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #a1a1a1;">
                        Мы получили запрос на сброс пароля для вашего аккаунта. Нажмите кнопку ниже, чтобы создать новый пароль.
                      </p>
                      
                      <!-- Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 8px 0 24px;">
                            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(168, 85, 247, 0.3);">
                              Сбросить пароль
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <div style="background: #1f1f1f; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                        <p style="margin: 0; font-size: 12px; color: #666;">
                          ⏱ Ссылка действительна <strong style="color: #a1a1a1;">1 час</strong>
                        </p>
                      </div>
                      
                      <p style="margin: 0; font-size: 12px; color: #525252; line-height: 1.5;">
                        Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо. Ваш аккаунт в безопасности.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 32px; background: #0f0f0f; border-top: 1px solid #262626; text-align: center;">
                      <p style="margin: 0; font-size: 12px; color: #525252;">
                        © ${new Date().getFullYear()} Avelon. Все права защищены.
                      </p>
                      <p style="margin: 8px 0 0; font-size: 11px; color: #404040;">
                        <a href="https://yourdomain.ru" style="color: #666; text-decoration: none;">yourdomain.ru</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ success: true }) // Всегда успех для безопасности
  }
}
