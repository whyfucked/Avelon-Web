#!/usr/bin/env node
/**
 * Test Pool Validation Logic
 * Simulates the pool validation without creating actual VMs
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

  async getClusterIPPools(clusterId) {
    const allPools = await this.getIPPools()
    return allPools.filter(pool => {
      if (Array.isArray(pool.cluster)) {
        return pool.cluster.includes(clusterId)
      }
      return pool.cluster === clusterId
    })
  }

  async validatePoolForCluster(poolId, clusterId) {
    const clusterPools = await this.getClusterIPPools(clusterId)
    const clusterPoolIds = clusterPools.map(p => p.id)
    
    if (clusterPoolIds.includes(poolId)) {
      console.log(`   ✅ Pool ${poolId} is valid for cluster ${clusterId}`)
      return poolId
    }
    
    console.log(`   ⚠️  Pool ${poolId} is NOT connected to cluster ${clusterId}`)
    console.log(`   Available pools:`, clusterPoolIds)
    
    if (clusterPoolIds.length > 0) {
      console.log(`   → Using first available pool: ${clusterPoolIds[0]}`)
      return clusterPoolIds[0]
    }
    
    console.log(`   → No pools available, VMManager6 will auto-select`)
    return undefined
  }
}

async function testPoolValidation() {
  try {
    console.log('🧪 Testing Pool Validation Logic\n')

    const api = new VMManager6Client()
    
    // Получаем VDS планы
    const plans = await prisma.plan.findMany({
      where: { 
        category: 'VDS',
        isActive: true
      }
    })

    console.log(`📦 Found ${plans.length} active VDS plans\n`)

    for (const plan of plans) {
      console.log(`\n📋 Testing Plan: ${plan.name}`)
      console.log(`   Cluster: ${plan.vmClusterId || 'not set'}`)
      console.log(`   IP Pool: ${plan.vmIpPoolId || 'not set'}`)

      if (!plan.vmIpPoolId) {
        console.log(`   ℹ️  No pool specified - VMManager6 will auto-select`)
        continue
      }

      if (!plan.vmClusterId) {
        console.log(`   ⚠️  No cluster specified - cannot validate`)
        continue
      }

      // Тестируем валидацию
      const validPoolId = await api.validatePoolForCluster(plan.vmIpPoolId, plan.vmClusterId)
      
      if (validPoolId === plan.vmIpPoolId) {
        console.log(`   ✅ PASS: Pool is valid, will use pool ${validPoolId}`)
      } else if (validPoolId) {
        console.log(`   ⚠️  CORRECTED: Will use pool ${validPoolId} instead of ${plan.vmIpPoolId}`)
      } else {
        console.log(`   ℹ️  AUTO: VMManager6 will auto-select pool`)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Test completed successfully!')
    console.log('\nThe validation logic will:')
    console.log('  1. Use the plan\'s pool if it\'s valid')
    console.log('  2. Auto-correct to first available pool if invalid')
    console.log('  3. Let VMManager6 choose if no pools available')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testPoolValidation()
