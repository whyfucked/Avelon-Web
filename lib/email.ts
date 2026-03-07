import nodemailer from 'nodemailer'
import { prisma } from './db'

interface SmtpSettings {
  host: string
  port: number
  user: string
  password: string
  from: string
  secure: boolean
}

async function getSmtpSettings(): Promise<SmtpSettings | null> {
  const settings = await prisma.adminSettings.findMany({
    where: { key: { startsWith: 'smtp_' } }
  })

  const smtp: Record<string, string> = {}
  settings.forEach(s => {
    smtp[s.key.replace('smtp_', '')] = s.value
  })

  if (!smtp.host || !smtp.user || !smtp.password) {
    return null
  }

  return {
    host: smtp.host,
    port: parseInt(smtp.port || '587'),
    user: smtp.user,
    password: smtp.password,
    from: smtp.from || smtp.user,
    secure: smtp.secure === 'true',
  }
}

async function createTransporter() {
  const smtp = await getSmtpSettings()
  if (!smtp) {
    throw new Error('SMTP не настроен')
  }

  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.password,
    },
  })
}

function getEmailTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:48px 24px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:400px;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="font-size:24px;font-weight:700;color:#fff;letter-spacing:2px;">AVELON</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="background:#111;border-radius:16px;padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <span style="font-size:12px;color:#666;">© ${new Date().getFullYear()} Avelon</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendVerificationCode(email: string, code: string): Promise<boolean> {
  try {
    const smtp = await getSmtpSettings()
    if (!smtp) {
      console.error('[Email] SMTP не настроен')
      return false
    }

    const transporter = await createTransporter()
    
    const content = `
      <p style="margin:0 0 24px;font-size:15px;color:#999;text-align:center;">Ваш код подтверждения</p>
      <p style="margin:0 0 24px;font-size:32px;font-weight:700;color:#fff;text-align:center;letter-spacing:6px;font-family:monospace;">${code}</p>
      <p style="margin:0;font-size:13px;color:#666;text-align:center;">Код действителен 15 минут</p>
    `

    await transporter.sendMail({
      from: smtp.from,
      to: email,
      subject: `${code} — код подтверждения`,
      html: getEmailTemplate(content),
    })

    return true
  } catch (error) {
    console.error('[Email] Ошибка отправки:', error)
    return false
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  try {
    const smtp = await getSmtpSettings()
    if (!smtp) return false

    const transporter = await createTransporter()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resetUrl = `${appUrl}/reset-password?token=${token}`
    
    const content = `
      <p style="margin:0 0 24px;font-size:15px;color:#999;text-align:center;">Сброс пароля</p>
      <p style="margin:0 0 24px;text-align:center;">
        <a href="${resetUrl}" style="display:inline-block;background:#fff;color:#000;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Сбросить пароль</a>
      </p>
      <p style="margin:0;font-size:13px;color:#666;text-align:center;">Ссылка действительна 1 час</p>
    `

    await transporter.sendMail({
      from: smtp.from,
      to: email,
      subject: 'Сброс пароля — Avelon',
      html: getEmailTemplate(content),
    })

    return true
  } catch (error) {
    console.error('[Email] Ошибка отправки:', error)
    return false
  }
}

export async function sendTestEmail(email: string): Promise<boolean> {
  try {
    const smtp = await getSmtpSettings()
    if (!smtp) return false

    const transporter = await createTransporter()
    
    const content = `
      <p style="margin:0 0 16px;font-size:15px;color:#999;text-align:center;">SMTP работает</p>
      <p style="margin:0;font-size:13px;color:#666;text-align:center;">${new Date().toLocaleString('ru-RU')}</p>
    `

    await transporter.sendMail({
      from: smtp.from,
      to: email,
      subject: 'Тест SMTP — Avelon',
      html: getEmailTemplate(content),
    })

    return true
  } catch (error) {
    console.error('[Email] Ошибка отправки:', error)
    return false
  }
}

export async function isSmtpConfigured(): Promise<boolean> {
  const smtp = await getSmtpSettings()
  return smtp !== null
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function generateRandomPassword(): string {
  const length = Math.floor(Math.random() * 7) + 8
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const special = '!@#$%^&*'
  
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]
  
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)]
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('')
}
export async function sendVdsDeletedEmail(
  email: string,
  data: {
    serverName: string
    reason?: string
    refundAmount?: number
  }
): Promise<boolean> {
  try {
    const smtp = await getSmtpSettings()
    if (!smtp) {
      console.error('[Email] SMTP не настроен')
      return false
    }

    const transporter = await createTransporter()
    
    const refundText = data.refundAmount && data.refundAmount > 0 
      ? `<tr>
          <td style="padding:10px 0;font-size:13px;color:#666;border-top:1px solid #333;">
            <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">💰</span>Возврат
          </td>
          <td style="padding:10px 0;font-size:14px;color:#10b981;text-align:right;font-weight:600;border-top:1px solid #333;">+${data.refundAmount} ₽</td>
        </tr>`
      : ''
    
    const content = `
      <p style="margin:0 0 24px;font-size:18px;font-weight:600;color:#fff;text-align:center;">VDS сервер удалён</p>
      
      <div style="background:#1a1a1a;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#666;">
              <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">🖥️</span>Сервер
            </td>
            <td style="padding:10px 0;font-size:14px;color:#fff;text-align:right;font-weight:500;">${data.serverName}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#666;border-top:1px solid #333;">
              <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">📋</span>Причина
            </td>
            <td style="padding:10px 0;font-size:14px;color:#fff;text-align:right;border-top:1px solid #333;">${data.reason || 'По запросу пользователя'}</td>
          </tr>
          ${refundText}
        </table>
      </div>
      
      <p style="margin:0;font-size:13px;color:#666;text-align:center;">Спасибо, что пользуетесь нашими услугами</p>
    `

    await transporter.sendMail({
      from: smtp.from,
      to: email,
      subject: `VDS ${data.serverName} удалён — Avelon`,
      html: getEmailTemplate(content),
    })

    console.log(`[Email] VDS deleted notification sent to ${email}`)
    return true
  } catch (error) {
    console.error('[Email] Ошибка отправки:', error)
    return false
  }
}

export async function sendVdsCreatedEmail(
  email: string,
  data: {
    serverName: string
    ipAddress: string | null
    osName: string
    password: string
    ram: number
    cpu: number
    disk: number
    panelUrl: string
  }
): Promise<boolean> {
  try {
    const smtp = await getSmtpSettings()
    if (!smtp) {
      console.error('[Email] SMTP не настроен')
      return false
    }

    const transporter = await createTransporter()
    
    const content = `
      <p style="margin:0 0 24px;font-size:18px;font-weight:600;color:#fff;text-align:center;">VDS сервер создан</p>
      
      <div style="background:#1a1a1a;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#666;">
              <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">🖥️</span>Имя сервера
            </td>
            <td style="padding:10px 0;font-size:14px;color:#fff;text-align:right;font-weight:500;">${data.serverName}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#666;border-top:1px solid #333;">
              <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">🌐</span>IP адрес
            </td>
            <td style="padding:10px 0;font-size:14px;color:#fff;text-align:right;font-family:monospace;border-top:1px solid #333;">${data.ipAddress || 'Назначается...'}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#666;border-top:1px solid #333;">
              <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">💿</span>ОС
            </td>
            <td style="padding:10px 0;font-size:14px;color:#fff;text-align:right;border-top:1px solid #333;">${data.osName}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#666;border-top:1px solid #333;">
              <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">🔑</span>Пароль root
            </td>
            <td style="padding:10px 0;font-size:14px;color:#10b981;text-align:right;font-family:monospace;border-top:1px solid #333;">${data.password}</td>
          </tr>
        </table>
      </div>

      <div style="background:#1a1a1a;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 16px;font-size:13px;color:#666;">Характеристики</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#999;">
              <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">⚡</span>CPU
            </td>
            <td style="padding:8px 0;font-size:14px;color:#fff;text-align:right;font-weight:500;">${data.cpu} ядер</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#999;border-top:1px solid #333;">
              <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">🧠</span>RAM
            </td>
            <td style="padding:8px 0;font-size:14px;color:#fff;text-align:right;font-weight:500;border-top:1px solid #333;">${data.ram} GB</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#999;border-top:1px solid #333;">
              <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">💾</span>Диск
            </td>
            <td style="padding:8px 0;font-size:14px;color:#fff;text-align:right;font-weight:500;border-top:1px solid #333;">${data.disk} GB</td>
          </tr>
        </table>
      </div>

      <p style="margin:0 0 16px;text-align:center;">
        <a href="${data.panelUrl}" style="display:inline-block;background:#fff;color:#000;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:14px;">Открыть панель управления</a>
      </p>
      
      <p style="margin:0;font-size:12px;color:#666;text-align:center;">Сохраните пароль в надёжном месте</p>
    `

    await transporter.sendMail({
      from: smtp.from,
      to: email,
      subject: `VDS ${data.serverName} создан — Avelon`,
      html: getEmailTemplate(content),
    })

    console.log(`[Email] VDS created notification sent to ${email}`)
    return true
  } catch (error) {
    console.error('[Email] Ошибка отправки:', error)
    return false
  }
}


export async function sendVdsReinstalledEmail(
  email: string,
  data: {
    serverName: string
    osName: string
    password: string
    ipAddress?: string
  }
): Promise<boolean> {
  try {
    const smtp = await getSmtpSettings()
    if (!smtp) {
      console.error('[Email] SMTP не настроен')
      return false
    }

    const transporter = await createTransporter()
    
    const content = `
      <p style="margin:0 0 24px;font-size:18px;font-weight:600;color:#fff;text-align:center;">ОС переустановлена</p>
      
      <div style="background:#1a1a1a;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#666;">
              <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">🖥️</span>Сервер
            </td>
            <td style="padding:10px 0;font-size:14px;color:#fff;text-align:right;font-weight:500;">${data.serverName}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#666;border-top:1px solid #333;">
              <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">🌐</span>IP адрес
            </td>
            <td style="padding:10px 0;font-size:14px;color:#fff;text-align:right;font-family:monospace;border-top:1px solid #333;">${data.ipAddress || 'Назначается...'}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#666;border-top:1px solid #333;">
              <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">💿</span>Новая ОС
            </td>
            <td style="padding:10px 0;font-size:14px;color:#fff;text-align:right;border-top:1px solid #333;">${data.osName}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#666;border-top:1px solid #333;">
              <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">🔑</span>Новый пароль
            </td>
            <td style="padding:10px 0;font-size:14px;color:#10b981;text-align:right;font-family:monospace;border-top:1px solid #333;">${data.password}</td>
          </tr>
        </table>
      </div>
      
      <p style="margin:0;font-size:12px;color:#666;text-align:center;">Сохраните новый пароль в надёжном месте</p>
    `

    await transporter.sendMail({
      from: smtp.from,
      to: email,
      subject: `ОС переустановлена на ${data.serverName} — Avelon`,
      html: getEmailTemplate(content),
    })

    console.log(`[Email] VDS reinstalled notification sent to ${email}`)
    return true
  } catch (error) {
    console.error('[Email] Ошибка отправки:', error)
    return false
  }
}

export async function sendVdsPasswordChangedEmail(
  email: string,
  data: {
    serverName: string
    password: string
    ipAddress?: string
  }
): Promise<boolean> {
  try {
    const smtp = await getSmtpSettings()
    if (!smtp) {
      console.error('[Email] SMTP не настроен')
      return false
    }

    const transporter = await createTransporter()
    
    const ipRow = data.ipAddress 
      ? `<tr>
          <td style="padding:10px 0;font-size:13px;color:#666;border-top:1px solid #333;">
            <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">🌐</span>IP адрес
          </td>
          <td style="padding:10px 0;font-size:14px;color:#fff;text-align:right;font-family:monospace;border-top:1px solid #333;">${data.ipAddress}</td>
        </tr>`
      : ''
    
    const content = `
      <p style="margin:0 0 24px;font-size:18px;font-weight:600;color:#fff;text-align:center;">Пароль изменён</p>
      
      <div style="background:#1a1a1a;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#666;">
              <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">🖥️</span>Сервер
            </td>
            <td style="padding:10px 0;font-size:14px;color:#fff;text-align:right;font-weight:500;">${data.serverName}</td>
          </tr>
          ${ipRow}
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#666;border-top:1px solid #333;">
              <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">🔑</span>Новый пароль
            </td>
            <td style="padding:10px 0;font-size:14px;color:#10b981;text-align:right;font-family:monospace;border-top:1px solid #333;">${data.password}</td>
          </tr>
        </table>
      </div>
      
      <p style="margin:0;font-size:12px;color:#666;text-align:center;">Сохраните новый пароль в надёжном месте</p>
    `

    await transporter.sendMail({
      from: smtp.from,
      to: email,
      subject: `Пароль изменён на ${data.serverName} — Avelon`,
      html: getEmailTemplate(content),
    })

    console.log(`[Email] VDS password changed notification sent to ${email}`)
    return true
  } catch (error) {
    console.error('[Email] Ошибка отправки:', error)
    return false
  }
}

export async function sendVmManagerAccountEmail(
  email: string,
  data: {
    vmEmail: string
    vmPassword?: string
  }
): Promise<boolean> {
  try {
    const smtp = await getSmtpSettings()
    if (!smtp) {
      console.error('[Email] SMTP не настроен')
      return false
    }

    const transporter = await createTransporter()
    
    const panelUrl = process.env.VMMANAGER6_API_URL?.replace('/api', '') || ''
    
    const passwordRow = data.vmPassword 
      ? `<tr>
          <td style="padding:10px 0;font-size:13px;color:#666;border-top:1px solid #333;">
            <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">🔑</span>Пароль
          </td>
          <td style="padding:10px 0;font-size:14px;color:#10b981;text-align:right;font-family:monospace;border-top:1px solid #333;">${data.vmPassword}</td>
        </tr>`
      : ''
    
    const content = `
      <p style="margin:0 0 24px;font-size:18px;font-weight:600;color:#fff;text-align:center;">Доступ к VMManager</p>
      
      <p style="margin:0 0 24px;font-size:14px;color:#ccc;text-align:center;">Данные для входа в панель управления серверами VMManager</p>
      
      <div style="background:#1a1a1a;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#666;">
              <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">📧</span>Email
            </td>
            <td style="padding:10px 0;font-size:14px;color:#fff;text-align:right;font-family:monospace;">${data.vmEmail}</td>
          </tr>
          ${passwordRow}
        </table>
      </div>

      <p style="margin:0 0 16px;text-align:center;">
        <a href="${panelUrl}" style="display:inline-block;background:#fff;color:#000;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:14px;">Открыть VMManager</a>
      </p>
      
      <p style="margin:0;font-size:12px;color:#666;text-align:center;">Сохраните эти данные в надёжном месте</p>
    `

    await transporter.sendMail({
      from: smtp.from,
      to: email,
      subject: 'Доступ к VMManager — Avelon',
      html: getEmailTemplate(content),
    })

    console.log(`[Email] VmManager account credentials sent to ${email}`)
    return true
  } catch (error) {
    console.error('[Email] Ошибка отправки:', error)
    return false
  }

}

export async function sendServicePaymentConfirmationEmail(
  email: string,
  data: {
    userName: string
    serviceName: string
    amount: number
    period: number
    expiresAt: Date
    serviceType: string
  }
): Promise<boolean> {
  try {
    const smtp = await getSmtpSettings()
    if (!smtp) {
      console.error('[Email] SMTP не настроен')
      return false
    }

    const transporter = await createTransporter()
    
    const content = `
      <p style="margin:0 0 24px;font-size:18px;font-weight:600;color:#fff;text-align:center;">Оплата успешно подтверждена!</p>
      
      <p style="margin:0 0 24px;font-size:15px;color:#999;text-align:center;">Здравствуйте, ${data.userName}!</p>
      <p style="margin:0 0 24px;font-size:14px;color:#ccc;text-align:center;">Ваш платёж за <strong style="color:#fff;">${data.serviceName}</strong> успешно обработан.</p>
      
      <div style="background:#1a1a1a;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 16px;font-size:13px;color:#666;">Детали:</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#666;">
              <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">💰</span>Сумма
            </td>
            <td style="padding:10px 0;font-size:14px;color:#fff;text-align:right;font-weight:500;">${data.amount} ₽</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#666;border-top:1px solid #333;">
              <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">📅</span>Период
            </td>
            <td style="padding:10px 0;font-size:14px;color:#fff;text-align:right;border-top:1px solid #333;">${data.period} мес.</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#666;border-top:1px solid #333;">
              <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">⏰</span>Дата истечения
            </td>
            <td style="padding:10px 0;font-size:14px;color:#fff;text-align:right;border-top:1px solid #333;">${data.expiresAt.toLocaleDateString('ru-RU')}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#666;border-top:1px solid #333;">
              <span style="display:inline-block;width:20px;text-align:center;margin-right:8px;">⚙️</span>Статус
            </td>
            <td style="padding:10px 0;font-size:14px;color:#3b82f6;text-align:right;font-weight:500;border-top:1px solid #333;">Установка</td>
          </tr>
        </table>
      </div>
      
      <p style="margin:0 0 16px;font-size:14px;color:#ccc;text-align:center;">Сервис будет готов в ближайшее время. Вы получите уведомление, когда он будет активирован.</p>
      
      <p style="margin:0;font-size:13px;color:#666;text-align:center;">С уважением, Команда Avelon</p>
    `

    await transporter.sendMail({
      from: smtp.from,
      to: email,
      subject: `Оплата ${data.serviceName} подтверждена — Avelon`,
      html: getEmailTemplate(content),
    })

    console.log(`[Email] Service payment confirmation sent to ${email}`)
    return true
  } catch (error) {
    console.error('[Email] Ошибка отправки:', error)
    return false
  }
}
