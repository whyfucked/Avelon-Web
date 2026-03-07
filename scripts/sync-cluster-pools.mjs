#!/usr/bin/env node
/**
 * Синхронизация IP пулов с кластерами VMManager6
 * Обновляет поле ipPoolIds в VdsCluster
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Простой HTTP клиент для VMManager6 API
class VMManager6Client {
  constructor() {
    this.baseUrl = process.env.VMMANAGER6_API_URL
    this.email = process.env.VMMANAGER6_EMAIL
    this.password = process.env.VMMANAGER6_PASSWORD
    this.cachedToken = null
    
    if (!this.baseUrl || !this.email || !this.password) {
      throw new Error('VMMANAGER6_API_URL, VMMANAGER6_EMAIL and VMMANAGER6_PASSWORD must be set in .env')
    }
    
    this.baseUrl = this.baseUrl.replace(/\/$/, '')
  }

  async authenticate() {
    const response = await fetch(`${this.baseUrl}/auth/v4/public/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: this.email,
        password: this.password,
      })
    })

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`)
    }

    const data = await response.json()
    this.cachedToken = data.token
    return data.token
  }

  async getToken() {
    if (!this.cachedToken) {
      return this.authenticate()
    }
    return this.cachedToken
  }

  async request(method, endpoint) {
    const token = await this.getToken()
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      method,
      headers: {
        'x-xsrf-token': token,
        'ISP-Session': token,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`VMManager6 API error: ${response.status}`)
    }

    return response.json()
  }

  async getIPPools() {
    const data = await this.request('GET', '/vm/v3/ippool')
    return data.list || []
  }

  async getClusters() {
    const data = await this.request('GET', '/vm/v3/cluster')
    return data.list || []
  }
}

async function syncClusterPools() {
  try {
    console.log('🔄 Синхронизация IP пулов с кластерами...')

    const api = new VMManager6Client()
    
    // Получаем все кластеры из VMManager6
    const vmClusters = await api.getClusters()
    console.log(`📦 Найдено ${vmClusters.length} кластеров в VMManager6`)

    // Получаем все IP пулы
    const allPools = await api.getIPPools()
    console.log(`🌐 Найдено ${allPools.length} IP пулов`)

    for (const vmCluster of vmClusters) {
      console.log(`\n🔍 Обработка кластера: ${vmCluster.name} (ID: ${vmCluster.id})`)

      // Находим пулы для этого кластера
      const clusterPools = allPools.filter(pool => {
        if (Array.isArray(pool.cluster)) {
          return pool.cluster.includes(vmCluster.id)
        }
        return pool.cluster === vmCluster.id
      })

      const poolIds = clusterPools.map(p => p.id)
      console.log(`  ✅ Найдено ${poolIds.length} пулов:`, clusterPools.map(p => `${p.name} (${p.id})`).join(', '))

      // Обновляем или создаём запись в базе
      await prisma.vdsCluster.upsert({
        where: { vmManagerId: vmCluster.id },
        update: {
          name: vmCluster.name,
          ipPoolIds: JSON.stringify(poolIds),
          updatedAt: new Date()
        },
        create: {
          vmManagerId: vmCluster.id,
          name: vmCluster.name,
          ipPoolIds: JSON.stringify(poolIds),
          isActive: true
        }
      })

      console.log(`  💾 Обновлена запись в базе данных`)
    }

    console.log('\n✅ Синхронизация завершена!')
  } catch (error) {
    console.error('❌ Ошибка синхронизации:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

syncClusterPools()
