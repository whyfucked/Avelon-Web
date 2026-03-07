import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth-admin'

// GET - получить настройки SMTP
export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const settings = await prisma.adminSettings.findMany({
      where: {
        key: {
          startsWith: 'smtp_'
        }
      }
    })

    const smtp: Record<string, string> = {}
    settings.forEach(s => {
      smtp[s.key.replace('smtp_', '')] = s.value
    })

    // Не возвращаем пароль в открытом виде
    if (smtp.password) {
      smtp.password = '••••••••'
    }

    return NextResponse.json(smtp)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load SMTP settings' }, { status: 500 })
  }
}

// POST - сохранить настройки SMTP
export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { host, port, user, password, from, secure } = body

    const settings = [
      { key: 'smtp_host', value: host || '' },
      { key: 'smtp_port', value: String(port || 587) },
      { key: 'smtp_user', value: user || '' },
      { key: 'smtp_from', value: from || '' },
      { key: 'smtp_secure', value: String(secure || false) },
    ]

    // Сохраняем пароль только если он изменён
    if (password && password !== '••••••••') {
      settings.push({ key: 'smtp_password', value: password })
    }

    for (const setting of settings) {
      await prisma.adminSettings.upsert({
        where: { key: setting.key },
        create: setting,
        update: { value: setting.value },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save SMTP settings' }, { status: 500 })
  }
}

// PUT - тест SMTP
export async function PUT(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { testEmail } = body

    if (!testEmail) {
      return NextResponse.json({ error: 'Test email required' }, { status: 400 })
    }

    const { sendTestEmail } = await import('@/lib/email')
    const sent = await sendTestEmail(testEmail)

    if (!sent) {
      return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Test email sent' })
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Failed to send test email', 
      details: error.message 
    }, { status: 500 })
  }
}
