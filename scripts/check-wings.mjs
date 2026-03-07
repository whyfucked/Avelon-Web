#!/usr/bin/env node

/**
 * Скрипт для проверки доступности Wings на всех нодах Pterodactyl
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PTERODACTYL_URL = process.env.PTERODACTYL_URL
const PTERODACTYL_API_KEY = process.env.PTERODACTYL_API_KEY

async function checkWings() {
  try {
    console.log('🔍 Проверка Wings на всех нодах...\n')

    if (!PTERODACTYL_URL || !PTERODACTYL_API_KEY) {
      console.error('❌ Pterodactyl не настроен в .env')
      process.exit(1)
    }

    // Получаем ноды из Pterodactyl
    const response = await fetch(`${PTERODACTYL_URL}/api/application/nodes`, {
      headers: {
        'Authorization': `Bearer ${PTERODACTYL_API_KEY}`,
        'Accept': 'application/json',
      }
    })

    if (!response.ok) {
      console.error('❌ Не удалось получить ноды из Pterodactyl')
      console.error('Status:', response.status)
      process.exit(1)
    }

    const data = await response.json()
    const nodes = data.data

    console.log(`Найдено нод: ${nodes.length}\n`)

    for (const nodeData of nodes) {
      const node = nodeData.attributes
      const wingsUrl = `${node.scheme}://${node.fqdn}:${node.daemon_listen}`
      
      console.log(`📍 Нода: ${node.name} (ID: ${node.id})`)
      console.log(`   URL: ${wingsUrl}`)
      
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        
        const wingsResponse = await fetch(wingsUrl, {
          method: 'GET',
          signal: controller.signal,
        })
        
        clearTimeout(timeout)
        
        if (wingsResponse.ok) {
          console.log(`   ✅ Wings ONLINE\n`)
        } else {
          console.log(`   ⚠️  Wings отвечает с ошибкой: ${wingsResponse.status}\n`)
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log(`   ❌ Wings TIMEOUT (не отвечает более 5 секунд)\n`)
        } else {
          console.log(`   ❌ Wings OFFLINE: ${error.message}\n`)
        }
      }
    }

    // Проверяем ноды в БД
    const dbNodes = await prisma.pterodactylNode.findMany({
      where: { isActive: true }
    })

    console.log(`\n📊 Активных нод в БД: ${dbNodes.length}`)
    
    for (const dbNode of dbNodes) {
      const pteroNode = nodes.find(n => n.attributes.id === dbNode.pterodactylId)
      if (!pteroNode) {
        console.log(`⚠️  Нода "${dbNode.name}" (ID: ${dbNode.id}) активна в БД, но не найдена в Pterodactyl!`)
      }
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

checkWings()
