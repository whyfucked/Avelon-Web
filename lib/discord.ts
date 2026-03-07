// Discord webhook для логирования событий
// ВАЖНО: URL должен быть установлен через переменную окружения
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || ''

if (!DISCORD_WEBHOOK_URL) {
  console.warn('[Discord] DISCORD_WEBHOOK_URL not configured')
}

export type DiscordLogType = 
  | 'DEPOSIT'      // Пополнение баланса
  | 'PAYMENT'      // Оплата сервера
  | 'RENEWAL'      // Продление сервера
  | 'REFUND'       // Возврат средств
  | 'SERVER_CREATE'// Создание сервера
  | 'SERVER_DELETE'// Удаление сервера
  | 'PROMO'        // Использование промокода
  | 'REGISTER'     // Регистрация пользователя

interface DiscordLogData {
  type: DiscordLogType
  userId?: string
  userEmail?: string
  amount?: number
  serverName?: string
  planName?: string
  promoCode?: string
  method?: string
  description?: string
}

const typeConfig: Record<DiscordLogType, { emoji: string; color: number; title: string }> = {
  DEPOSIT: { emoji: '💰', color: 0x22c55e, title: 'Пополнение баланса' },
  PAYMENT: { emoji: '💳', color: 0x3b82f6, title: 'Оплата сервера' },
  RENEWAL: { emoji: '🔄', color: 0x8b5cf6, title: 'Продление сервера' },
  REFUND: { emoji: '↩️', color: 0xf59e0b, title: 'Возврат средств' },
  SERVER_CREATE: { emoji: '🚀', color: 0x06b6d4, title: 'Создание сервера' },
  SERVER_DELETE: { emoji: '🗑️', color: 0xef4444, title: 'Удаление сервера' },
  PROMO: { emoji: '🎁', color: 0xec4899, title: 'Промокод активирован' },
  REGISTER: { emoji: '👤', color: 0x6366f1, title: 'Новый пользователь' },
}

export async function sendDiscordLog(data: DiscordLogData): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn('[Discord] Webhook URL not configured')
    return
  }

  const config = typeConfig[data.type]
  const fields: { name: string; value: string; inline: boolean }[] = []

  if (data.userEmail) {
    fields.push({ name: '👤 Пользователь', value: data.userEmail, inline: true })
  }
  if (data.userId) {
    fields.push({ name: '🆔 ID', value: `\`${data.userId.slice(0, 8)}...\``, inline: true })
  }
  if (data.amount !== undefined) {
    const sign = data.type === 'REFUND' || data.type === 'PAYMENT' || data.type === 'RENEWAL' ? '-' : '+'
    fields.push({ name: '💵 Сумма', value: `${sign}${data.amount} ₽`, inline: true })
  }
  if (data.serverName) {
    fields.push({ name: '🖥️ Сервер', value: data.serverName, inline: true })
  }
  if (data.planName) {
    fields.push({ name: '📦 Тариф', value: data.planName, inline: true })
  }
  if (data.method) {
    fields.push({ name: '💳 Метод', value: data.method, inline: true })
  }
  if (data.promoCode) {
    fields.push({ name: '🎁 Промокод', value: data.promoCode, inline: true })
  }
  if (data.description) {
    fields.push({ name: '📝 Описание', value: data.description, inline: false })
  }

  const embed = {
    title: `${config.emoji} ${config.title}`,
    color: config.color,
    fields,
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Avelon Hosting',
    },
  }

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })

    if (!response.ok) {
      console.error('[Discord] Failed to send log:', response.status, await response.text())
    }
  } catch (error) {
    console.error('[Discord] Error sending log:', error)
  }
}
