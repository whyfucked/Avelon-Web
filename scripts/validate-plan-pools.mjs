#!/usr/bin/env node
/**
 * Валидация IP пулов в VDS планах
 * Проверяет что vmIpPoolId подключен к vmClusterId
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

async function validatePlanPools() {
  try {
    console.log('🔍 Проверка IP пулов в VDS планах...\n')

    const api = new VMManager6Client()
    
    // Получаем все VDS планы
    const plans = await prisma.plan.findMany({
      where: { 
        category: 'VDS',
        isActive: true
      }
    })

    console.log(`📦 Найдено ${plans.length} активных VDS планов\n`)

    // Получаем все пулы и кластеры
    const allPools = await api.getIPPools()
    const allClusters = await api.getClusters()

    console.log(`🌐 Всего IP пулов: ${allPools.length}`)
    console.log(`🖥️  Всего кластеров: ${allClusters.length}\n`)

    // Создаём карту кластер -> пулы
    const clusterPoolsMap = new Map()
    for (const pool of allPools) {
      const clusterIds = Array.isArray(pool.cluster) ? pool.cluster : [pool.cluster]
      for (const clusterId of clusterIds) {
        if (!clusterPoolsMap.has(clusterId)) {
          clusterPoolsMap.set(clusterId, [])
        }
        clusterPoolsMap.get(clusterId).push(pool.id)
      }
    }

    let issuesFound = 0
    const fixes = []

    for (const plan of plans) {
      console.log(`\n📋 План: ${plan.name} (ID: ${plan.id})`)
      console.log(`   Cluster: ${plan.vmClusterId || 'не указан'}`)
      console.log(`   IP Pool: ${plan.vmIpPoolId || 'не указан'}`)

      // Если пул не указан - это нормально
      if (!plan.vmIpPoolId) {
        console.log(`   ✅ Пул не указан - VMManager6 выберет автоматически`)
        continue
      }

      // Если кластер не указан - предупреждение
      if (!plan.vmClusterId) {
        console.log(`   ⚠️  Кластер не указан, но пул задан`)
        issuesFound++
        continue
      }

      // Проверяем что пул подключен к кластеру
      const clusterPools = clusterPoolsMap.get(plan.vmClusterId) || []
      
      if (clusterPools.includes(plan.vmIpPoolId)) {
        console.log(`   ✅ Пул ${plan.vmIpPoolId} подключен к кластеру ${plan.vmClusterId}`)
      } else {
        console.log(`   ❌ ОШИБКА: Пул ${plan.vmIpPoolId} НЕ подключен к кластеру ${plan.vmClusterId}`)
        console.log(`   Доступные пулы для кластера ${plan.vmClusterId}:`, clusterPools)
        
        issuesFound++
        
        // Предлагаем исправление
        if (clusterPools.length > 0) {
          fixes.push({
            planId: plan.id,
            planName: plan.name,
            currentPool: plan.vmIpPoolId,
            suggestedPool: clusterPools[0],
            clusterId: plan.vmClusterId
          })
        }
      }
    }

    // Выводим итоги
    console.log('\n' + '='.repeat(60))
    if (issuesFound === 0) {
      console.log('✅ Все планы настроены корректно!')
    } else {
      console.log(`❌ Найдено проблем: ${issuesFound}`)
      
      if (fixes.length > 0) {
        console.log('\n💡 Предлагаемые исправления:')
        for (const fix of fixes) {
          console.log(`\n   План: ${fix.planName} (ID: ${fix.planId})`)
          console.log(`   Текущий пул: ${fix.currentPool}`)
          console.log(`   Предлагаемый пул: ${fix.suggestedPool}`)
          console.log(`   Кластер: ${fix.clusterId}`)
          console.log(`   SQL: UPDATE "Plan" SET "vmIpPoolId" = ${fix.suggestedPool} WHERE id = '${fix.planId}';`)
        }
      }
    }

  } catch (error) {
    console.error('❌ Ошибка:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

validatePlanPools()
