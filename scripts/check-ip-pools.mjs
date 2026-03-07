#!/usr/bin/env node
/**
 * Проверка IP пулов - сколько свободных IP
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

async function checkIPPools() {
  try {
    console.log('🔍 Проверка IP пулов...\n')

    const api = new VMManager6Client()
    
    const pools = await api.getIPPools()
    const clusters = await api.getClusters()

    console.log(`📦 Всего IP пулов: ${pools.length}`)
    console.log(`🖥️  Всего кластеров: ${clusters.length}\n`)

    // Группируем пулы по кластерам
    const clusterPoolsMap = new Map()
    
    for (const pool of pools) {
      const clusterIds = Array.isArray(pool.cluster) ? pool.cluster : [pool.cluster]
      
      for (const clusterId of clusterIds) {
        if (!clusterPoolsMap.has(clusterId)) {
          clusterPoolsMap.set(clusterId, [])
        }
        clusterPoolsMap.get(clusterId).push(pool)
      }
    }

    // Выводим информацию по каждому кластеру
    for (const cluster of clusters) {
      console.log(`\n🖥️  Кластер: ${cluster.name} (ID: ${cluster.id})`)
      
      const clusterPools = clusterPoolsMap.get(cluster.id) || []
      
      if (clusterPools.length === 0) {
        console.log('   ❌ НЕТ ПОДКЛЮЧЕННЫХ IP ПУЛОВ!')
        continue
      }

      console.log(`   Подключено пулов: ${clusterPools.length}`)
      
      for (const pool of clusterPools) {
        const total = pool.ip_count || 0
        const used = pool.ip_used || 0
        const free = total - used
        
        const status = free > 0 ? '✅' : '❌'
        
        console.log(`   ${status} Пул ${pool.id}: ${pool.name}`)
        console.log(`      Всего IP: ${total}`)
        console.log(`      Занято: ${used}`)
        console.log(`      Свободно: ${free}`)
        
        if (free === 0) {
          console.log(`      ⚠️  ПУЛЛ ПОЛНОСТЬЮ ЗАНЯТ!`)
        }
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('💡 Рекомендации:')
    console.log('   1. Если все пулы заняты - добавьте новые IP адреса в VMManager6')
    console.log('   2. Или создайте новый IP пул и подключите к кластеру')
    console.log('   3. Или освободите неиспользуемые IP адреса')

  } catch (error) {
    console.error('❌ Ошибка:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

checkIPPools()
