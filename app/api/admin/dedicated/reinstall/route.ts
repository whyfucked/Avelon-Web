import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST - отправить запрос на переустановку ОС дедика в Discord
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const body = await req.json()
    const { serverId, serverName, os, password } = body

    if (!serverId || !serverName || !os) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Проверяем, что сервер принадлежит пользователю
    const server = await prisma.dedicatedServer.findUnique({
      where: { id: serverId },
    })

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    if (server.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Устанавливаем статус "Установка"
    await prisma.dedicatedServer.update({
      where: { id: serverId },
      data: { status: 'INSTALLING' },
    })

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1463224700443557960/Jafdy2ffnz6v6_af8Hp5KajCIVfCknp-mo1NlDzgxdrMUg1EYQFcmG6TwHIQNK7qNNTt'
    
    // Отправляем в Discord
    const discordMessage = {
      embeds: [{
        title: '🔄 Запрос на переустановку ОС (Dedicated Server)',
        description: `Пользователь запросил переустановку операционной системы на выделенном сервере.`,
        color: 0xf59e0b, // Amber color
        fields: [
          { name: '👤 Пользователь', value: user.name || user.email, inline: true },
          { name: '📧 Email', value: user.email, inline: true },
          { name: '🆔 User ID', value: user.id, inline: true },
          { name: '🖥️ Сервер', value: serverName, inline: true },
          { name: '🔑 Server ID', value: serverId, inline: true },
          { name: '💿 Новая ОС', value: os, inline: true },
          { name: '🔐 Root пароль', value: `\`${password}\``, inline: false },
        ],
        footer: {
          text: 'Avelon Hosting • Dedicated Server Reinstall'
        },
        timestamp: new Date().toISOString(),
      }],
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordMessage),
    })

    if (!response.ok) {
      console.error('[Discord Webhook] Failed:', response.status)
      return NextResponse.json({ error: 'Failed to send request' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Dedicated Reinstall]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
