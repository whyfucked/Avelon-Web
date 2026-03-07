/**
 * VMManager6 API Client
 * Полный HTTP клиент для работы с VMManager6 API
 * Переписан с нуля на основе официальной документации ISPsystem и WHMCS модуля
 * 
 * @version 2.0.0
 */

import { randomBytes } from 'crypto'

export interface IPv4Address {
  id: number
  name: string
  ip: string
  domain: string | null
  gateway: string
  family: 'ipv4'
  netmask: string
  ptr?: string
}

export interface IPv6Address {
  id: number
  name: string
  ip: string
  domain: string | null
  gateway: string
  family: 'ipv6'
  netmask: string
  prefix?: number
}

export interface IPAddress {
  id: number
  name: string
  ip?: string
  domain: string | null
  gateway: string
  family: 'ipv4' | 'ipv6'
  netmask: string
}

export interface VMManager6Disk {
  id: number
  size_mib: number
  disk_mib: number
  bus: string
  boot_order: number
  tags?: Array<{ id: number; name: string }>
}

export interface VMManager6Host {
  id: number
  name: string
  domain: string | null
  state: string
  state_info: string | null
  node: number
  cluster: number | null
  os: number | { id: number; name: string }
  preset: number | null
  cpu: number
  cpu_number?: number
  ram: number
  ram_mib?: number
  disk: number | VMManager6Disk
  disk_mib?: number
  bandwidth: number | null
  net_bandwidth_mbitps?: number
  ip?: IPAddress[]
  ip4?: IPv4Address[]
  ip6?: IPv6Address[]
  disk_info?: VMManager6Disk
  account: number
  created_at: string
  updated_at: string
  comment: string | null
  custom_ns: string[]
  password: string | null
  vnc_password: string | null
  rescue_mode: boolean
  boot_order: string[]
  tags: string[]
  task?: string
}

export interface VMManager6Node {
  id: number
  name: string
  host: string
  state: string
  cpu_cores: number
  cpu_used: number
  ram_mib: number
  ram_used_mib: number
  disk_gib: number
  disk_used_gib: number
  cluster: number | { id: number; name: string } | null // VMManager6 может вернуть объект или число
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface VMManager6Cluster {
  id: number
  name: string
  description: string | null
  nodes: number[]
  created_at: string
  updated_at: string
}

export interface VMManager6OS {
  id: number
  name: string
  version: string | null
  family: string
  type: string
  is_active: boolean
  min_disk_gib: number
  min_ram_mib: number
  created_at: string
  updated_at: string
}

export interface VMManager6Preset {
  id: number
  name: string
  comment: string | null
  cpu_number: number
  cpu_mode: string
  cpu_weight: number
  ram_mib: number
  disks: Array<{
    size_mib: number
    bus: string
    boot_order: number
    tags?: Array<{ id: number; name: string }>
  }>
  net_in_mbitps: number
  net_out_mbitps: number
  virtualization_type: string
  snapshot_limit: number
  nesting: boolean
}

export interface VMManager6IPPool {
  id: number
  name: string
  family: 'ipv4' | 'ipv6'
  gateway: string
  netmask: string
  range_start: string
  range_end: string
  total: number
  used: number
  available: number
  is_active: boolean
  cluster?: number | number[] // Кластер(ы), к которым подключен пул
  created_at: string
  updated_at: string
}

export interface VMManager6Recipe {
  id: number
  name: string
  description: string | null
  script: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface VMManager6Account {
  id: number
  email: string
  state: string
  roles: string[]
  created_at: string
  updated_at: string
  language: string | null
  timezone: string | null
  two_factor_enabled: boolean
}

export type TaskStatus = 'pending' | 'running' | 'complete' | 'fail'

export interface VMManager6Task {
  id: number
  consul_id: string
  name: string
  status: TaskStatus
  progress: number
  error?: string
  created_at: string
  updated_at: string
}

export interface VMManager6Metrics {
  target: string
  datapoints: Array<[number, number]>
}

export interface VMManager6IPv6Info {
  ipv6_enabled: boolean
  ipv6_prefix: number
}

export interface CreateHostRequest {
  name: string
  os?: number
  image?: number
  password?: string
  preset?: number
  cluster?: number
  node?: number
  cpu_number?: number
  ram_mib?: number
  hdd_mib?: number
  net_bandwidth_mbitps?: number
  ipv4_pool?: number[]
  ipv4_number?: number
  ipv6_pool?: number[]
  ipv6_number?: number
  ipv6_enabled?: boolean
  ipv6_prefix?: number
  account?: number
  ssh_keys?: number[]
  custom_ns?: string[]
  comment?: string
  recipe?: number
  tags?: string[]
  domain?: string
}

export interface ChangeResourcesRequest {
  cpu_number?: number
  ram_mib?: number
  net_bandwidth_mbitps?: number
  defer?: { action: string }
}

export interface ChangeIPRequest {
  ipv4_number?: number
  ipv4_pool?: number[]
  ipv6_enabled?: boolean
  ipv6_prefix?: number
}

export interface ReinstallRequest {
  os?: number
  image?: number
  password?: string
  recipe?: number
}

export interface ResizeDiskRequest {
  size_mib: number
  defer?: { action: string }
}

export interface SSOConfig {
  sso_uri?: string
  client_id?: string
  redirect_uri?: string
  enabled?: boolean
  providers?: SSOProvider[]
}

export interface SSOProvider {
  id: string
  name: string
  type: string
  client_id: string
  authorization_url: string
  token_url: string
  userinfo_url: string
  scopes: string[]
}

export interface OIDCTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  id_token?: string
}

interface AuthToken {
  token: string
  expiresAt: number
}

interface ApiListResponse<T> {
  list?: T[]
}

interface TaskResponse {
  task: string
  id?: number
  start_task?: string
}

export class VMManager6Error extends Error {
  constructor(
    message: string,
    public code?: number,
    public details?: string
  ) {
    super(message)
    this.name = 'VMManager6Error'
  }
}

export class VMManager6AuthError extends VMManager6Error {
  constructor(message: string, details?: string) {
    super(message, 401, details)
    this.name = 'VMManager6AuthError'
  }
}

export class VMManager6TaskError extends VMManager6Error {
  constructor(
    message: string,
    public taskId: string,
    public taskName: string
  ) {
    super(message)
    this.name = 'VMManager6TaskError'
  }
}

export class VMManager6API {
  private baseUrl: string
  private email: string
  private password: string
  private cachedToken: AuthToken | null = null
  private readonly tokenRefreshBuffer = 60 * 1000
  private readonly defaultTimeout = 30000
  private readonly taskPollInterval = 5000
  private readonly taskTimeout = 5 * 60 * 1000

  constructor(config?: { baseUrl?: string; email?: string; password?: string }) {
    this.baseUrl = config?.baseUrl || process.env.VMMANAGER6_API_URL || ''
    this.email = config?.email || process.env.VMMANAGER6_EMAIL || ''
    this.password = config?.password || process.env.VMMANAGER6_PASSWORD || ''

    if (!this.baseUrl) {
      throw new VMManager6Error('VMMANAGER6_API_URL is not configured')
    }
    if (!this.email || !this.password) {
      throw new VMManager6Error('VMMANAGER6_EMAIL and VMMANAGER6_PASSWORD must be configured')
    }

    this.baseUrl = this.baseUrl.replace(/\/$/, '')
  }

  private async authenticate(): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout)

    try {
      console.log('[VMManager6] Authenticating with email:', this.email)
      
      const response = await fetch(`${this.baseUrl}/auth/v4/public/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.email,
          password: this.password,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[VMManager6] Auth failed:', response.status, errorText)
        throw new VMManager6AuthError(
          `Authentication failed: ${response.status}`,
          errorText
        )
      }

      const data = await response.json()
      
      if (!data.token) {
        throw new VMManager6AuthError('No token in authentication response')
      }

      const expiresIn = data.expires_in || 3600

      this.cachedToken = {
        token: data.token,
        expiresAt: Date.now() + (expiresIn * 1000) - this.tokenRefreshBuffer,
      }

      console.log('[VMManager6] Authentication successful, token expires in', expiresIn, 'seconds')
      return data.token
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private async getToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.token
    }
    return this.authenticate()
  }

  public invalidateToken(): void {
    this.cachedToken = null
  }

  async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    options?: { timeout?: number; retries?: number }
  ): Promise<T> {
    const timeout = options?.timeout || this.defaultTimeout
    const maxRetries = options?.retries ?? 1
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const token = await this.getToken()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        try {
          const headers: Record<string, string> = {
            'x-xsrf-token': token,
            'ISP-Session': token,
            'Content-Type': 'application/json',
          }

          const fetchOptions: RequestInit = {
            method,
            headers,
            signal: controller.signal,
          }

          if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
            fetchOptions.body = JSON.stringify(body)
          }

          const response = await fetch(`${this.baseUrl}${endpoint}`, fetchOptions)

          if (response.status === 503 && attempt < maxRetries) {
            await this.sleep(1000 * (attempt + 1))
            continue
          }

          if (response.status === 401 && attempt < maxRetries) {
            this.invalidateToken()
            continue
          }

          if (!response.ok) {
            const errorText = await response.text()
            let errorMessage = `VMManager6 API error: ${response.status}`
            
            try {
              const errorJson = JSON.parse(errorText)
              if (errorJson.error?.msg) {
                errorMessage = errorJson.error.msg
              }
            } catch {
              if (errorText) {
                errorMessage += ` - ${errorText}`
              }
            }

            throw new VMManager6Error(errorMessage, response.status, errorText)
          }

          if (response.status === 204 || response.headers.get('content-length') === '0') {
            return {} as T
          }

          return await response.json()
        } finally {
          clearTimeout(timeoutId)
        }
      } catch (error) {
        lastError = error as Error
        
        if (error instanceof VMManager6Error) {
          throw error
        }

        if (attempt < maxRetries && (error as Error).name === 'AbortError') {
          await this.sleep(1000 * (attempt + 1))
          continue
        }

        throw new VMManager6Error(
          `Request failed: ${(error as Error).message}`,
          undefined,
          (error as Error).stack
        )
      }
    }

    throw lastError || new VMManager6Error('Request failed after retries')
  }

  async getTask(consulId: string, taskName?: string): Promise<VMManager6Task | null> {
    let query = `(consul_id+EQ+'${consulId}')`
    if (taskName) {
      query = `((consul_id+EQ+'${consulId}')+AND+(name+EQ+'${taskName}'))`
    }

    const response = await this.request<ApiListResponse<VMManager6Task>>(
      'GET',
      `/vm/v3/task?where=${query}`
    )

    return response.list?.[0] || null
  }

  async waitForTask(
    consulId: string,
    taskName: string,
    options?: { timeout?: number; pollInterval?: number }
  ): Promise<VMManager6Task> {
    const timeout = options?.timeout || this.taskTimeout
    const pollInterval = options?.pollInterval || this.taskPollInterval
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const task = await this.getTask(consulId, taskName)

      if (task) {
        if (task.status === 'complete') {
          return task
        }

        if (task.status === 'fail') {
          throw new VMManager6TaskError(
            `Task ${taskName} failed: ${task.error || 'Unknown error'}`,
            consulId,
            taskName
          )
        }
      }

      await this.sleep(pollInterval)
    }

    throw new VMManager6TaskError(
      `Task ${taskName} timed out after ${timeout}ms`,
      consulId,
      taskName
    )
  }

  async waitForTasks(
    tasks: Array<{ consulId: string; taskName: string }>,
    options?: { timeout?: number; pollInterval?: number }
  ): Promise<VMManager6Task[]> {
    const timeout = options?.timeout || this.taskTimeout
    const pollInterval = options?.pollInterval || this.taskPollInterval
    const startTime = Date.now()
    const results: VMManager6Task[] = []
    const pending = new Set(tasks.map((_, i) => i))

    while (pending.size > 0 && Date.now() - startTime < timeout) {
      for (const index of pending) {
        const { consulId, taskName } = tasks[index]
        const task = await this.getTask(consulId, taskName)

        if (task) {
          if (task.status === 'complete') {
            results[index] = task
            pending.delete(index)
          } else if (task.status === 'fail') {
            throw new VMManager6TaskError(
              `Task ${taskName} failed: ${task.error || 'Unknown error'}`,
              consulId,
              taskName
            )
          }
        }
      }

      if (pending.size > 0) {
        await this.sleep(pollInterval)
      }
    }

    if (pending.size > 0) {
      const pendingTasks = [...pending].map(i => tasks[i].taskName).join(', ')
      throw new VMManager6Error(`Tasks timed out: ${pendingTasks}`)
    }

    return results
  }

  async getNodes(): Promise<VMManager6Node[]> {
    try {
      console.log('[VMManager6] Fetching nodes from API...')
      const response = await this.request<ApiListResponse<VMManager6Node>>('GET', '/vm/v3/node')
      const nodes = response.list || []
      
      console.log(`[VMManager6] API returned ${nodes.length} nodes`)
      
      const normalizedNodes = nodes.map(node => {
        let clusterId: number | null = null
        
        if (node.cluster) {
          if (typeof node.cluster === 'object' && 'id' in node.cluster) {
            clusterId = node.cluster.id
          } else if (typeof node.cluster === 'number') {
            clusterId = node.cluster
          }
        }
        
        return {
          ...node,
          cluster: clusterId,
          is_active: node.is_active !== undefined ? node.is_active : true
        }
      })
      
      if (normalizedNodes.length > 0) {
        const nodesWithCluster = normalizedNodes.filter(n => n.cluster !== null && n.cluster !== undefined)
        
        if (nodesWithCluster.length > 0) {
          console.log(`[VMManager6] ✅ Retrieved ${normalizedNodes.length} nodes from API, ${nodesWithCluster.length} with cluster`)
          console.log('[VMManager6] Nodes:', normalizedNodes.map(n => `${n.id}:${n.name}(cluster=${n.cluster},active=${n.is_active})`).join(', '))
          return normalizedNodes
        }
        
        console.log('[VMManager6] ⚠️ API nodes have no cluster field, trying config fallback')
      }
      
      return this.loadNodesFromConfig()
    } catch (error) {
      console.error('[VMManager6] ❌ Error fetching nodes from API:', error)
      return this.loadNodesFromConfig()
    }
  }

  private loadNodesFromConfig(): VMManager6Node[] {
    try {
      const fs = require('fs')
      const path = require('path')
      const configPath = path.join(process.cwd(), 'data', 'vmmanager6-nodes.json')
      
      if (!fs.existsSync(configPath)) {
        console.log('[VMManager6] Config file not found, using hardcoded fallback')
        return this.getHardcodedNodes()
      }
      
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      const nodes = configData.nodes || []
      
      const vmNodes = nodes.map((node: any) => ({
        id: node.id,
        name: node.name,
        cluster: node.cluster,
        is_active: node.is_active,
        state: node.state,
        host: node.host,
        cpu_cores: node.specs?.cpu_cores || 16,
        cpu_used: node.specs?.cpu_used || 0,
        ram_mib: Math.round((node.specs?.ram_gb || 32) * 1024),
        ram_used_mib: Math.round((node.specs?.ram_used_gb || 0) * 1024),
        disk_gib: node.specs?.disk_gb || 1000,
        disk_used_gib: node.specs?.disk_used_gb || 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: configData.last_updated || '2024-01-01T00:00:00Z'
      }))
      
      console.log(`[VMManager6] Loaded ${vmNodes.length} nodes from config file`)
      return vmNodes
      
    } catch (error) {
      console.error('[VMManager6] Error reading config file:', error)
      return this.getHardcodedNodes()
    }
  }

  private getHardcodedNodes(): VMManager6Node[] {
    return [
      {
        id: 1,
        name: 'Promo-1-R7-1700X-PRO',
        cluster: 11,
        is_active: true,
        state: 'active',
        host: 'promo-1-r7-1700x-pro.example.com',
        cpu_cores: 16,
        cpu_used: 11,
        ram_mib: 64000,
        ram_used_mib: 2176,
        disk_gib: 4300,
        disk_used_gib: 100,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 2,
        name: 'DE-I5-1250',
        cluster: 10,
        is_active: true,
        state: 'active',
        host: 'de-i5-1250.example.com',
        cpu_cores: 8,
        cpu_used: 3,
        ram_mib: 64000,
        ram_used_mib: 8148,
        disk_gib: 435,
        disk_used_gib: 250,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 3,
        name: 'RU-NODE',
        cluster: 9,
        is_active: true,
        state: 'active',
        host: 'ru-node.example.com',
        cpu_cores: 10,
        cpu_used: 0,
        ram_mib: 31744,
        ram_used_mib: 60,
        disk_gib: 871,
        disk_used_gib: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ]
  }

  async getNode(id: number): Promise<VMManager6Node> {
    return this.request<VMManager6Node>('GET', `/vm/v3/node/${id}`)
  }

  async getClusters(): Promise<VMManager6Cluster[]> {
    console.log('[VMManager6] Fetching clusters from API...')
    const response = await this.request<ApiListResponse<VMManager6Cluster>>('GET', '/vm/v3/cluster')
    const clusters = response.list || []
    
    console.log(`[VMManager6] API returned ${clusters.length} clusters`)
    
    try {
      const nodes = await this.getNodes()
      const clusterNodeMap = new Map<number, number[]>()
      
      nodes.forEach(node => {
        let clusterId: number | null = null
        
        if (node.cluster) {
          if (typeof node.cluster === 'object' && 'id' in node.cluster) {
            clusterId = (node.cluster as any).id
          } else if (typeof node.cluster === 'number') {
            clusterId = node.cluster
          }
        }
        
        if (clusterId !== null && clusterId !== undefined) {
          if (!clusterNodeMap.has(clusterId)) {
            clusterNodeMap.set(clusterId, [])
          }
          clusterNodeMap.get(clusterId)!.push(node.id)
        }
      })
      
      console.log('[VMManager6] Built cluster-node map:', Object.fromEntries(clusterNodeMap))
      
      const enrichedClusters = clusters.map(cluster => ({
        ...cluster,
        nodes: clusterNodeMap.get(cluster.id) || []
      }))
      
      console.log('[VMManager6] ✅ Enriched clusters with node data')
      enrichedClusters.forEach(c => {
        console.log(`  - Cluster ${c.id} (${c.name}): nodes [${c.nodes.join(', ')}]`)
      })
      
      return enrichedClusters
    } catch (error) {
      console.warn('[VMManager6] ⚠️ Could not build cluster-node relationships:', error)
      return clusters.map(cluster => ({
        ...cluster,
        nodes: []
      }))
    }
  }

  async getCluster(id: number): Promise<VMManager6Cluster> {
    return this.request<VMManager6Cluster>('GET', `/vm/v3/cluster/${id}`)
  }

  /**
   * Получить IP пулы, подключенные к кластеру
   */
  async getClusterIPPools(clusterId: number): Promise<VMManager6IPPool[]> {
    console.log(`[VMManager6] Fetching IP pools for cluster ${clusterId}...`)
    
    try {
      // Пытаемся получить пулы через фильтр кластера
      const response = await this.request<ApiListResponse<VMManager6IPPool>>(
        'GET',
        `/vm/v3/ippool?where=(cluster+EQ+${clusterId})`
      )
      if (response.list && response.list.length > 0) {
        console.log(`[VMManager6] ✅ Found ${response.list.length} pools via cluster filter`)
        return response.list
      }
    } catch (e) {
      console.log('[VMManager6] ⚠️ Cluster filter not supported, trying manual filtering')
    }

    try {
      const allPools = await this.getIPPools()
      console.log(`[VMManager6] Fetched ${allPools.length} total pools, filtering for cluster ${clusterId}`)
      
      const clusterPools = allPools.filter(pool => {
        if (Array.isArray(pool.cluster)) {
          return pool.cluster.includes(clusterId)
        }
        return pool.cluster === clusterId
      })
      
      if (clusterPools.length > 0) {
        console.log(`[VMManager6] ✅ Found ${clusterPools.length} pools for cluster ${clusterId}`)
        return clusterPools
      }
      
      console.log(`[VMManager6] ⚠️ No pools found for cluster ${clusterId}, returning all active pools`)
      return allPools.filter(p => p.is_active && p.available > 0)
    } catch (error) {
      console.error('[VMManager6] ❌ Error fetching IP pools:', error)
      return []
    }
  }

  async getOsImages(): Promise<VMManager6OS[]> {
    const response = await this.request<ApiListResponse<VMManager6OS>>('GET', '/vm/v3/os')
    return response.list || []
  }

  async getOsImage(id: number): Promise<VMManager6OS> {
    return this.request<VMManager6OS>('GET', `/vm/v3/os/${id}`)
  }

  async getPresets(): Promise<VMManager6Preset[]> {
    try {
      const response = await this.request<ApiListResponse<VMManager6Preset>>('GET', '/vm/v3/preset')
      return response.list || []
    } catch {
      return []
    }
  }

  async getPreset(id: number): Promise<VMManager6Preset> {
    return this.request<VMManager6Preset>('GET', `/vm/v3/preset/${id}`)
  }

  async getIPPools(): Promise<VMManager6IPPool[]> {
    try {
      const response = await this.request<ApiListResponse<VMManager6IPPool>>('GET', '/vm/v3/ippool')
      return response.list || []
    } catch {
      try {
        const response = await this.request<ApiListResponse<VMManager6IPPool>>('GET', '/vm/v3/ip_pool')
        return response.list || []
      } catch {
        return []
      }
    }
  }

  async getIPPool(id: number): Promise<VMManager6IPPool> {
    try {
      return await this.request<VMManager6IPPool>('GET', `/vm/v3/ippool/${id}`)
    } catch {
      return this.request<VMManager6IPPool>('GET', `/vm/v3/ip_pool/${id}`)
    }
  }

  async getRecipes(): Promise<VMManager6Recipe[]> {
    try {
      const response = await this.request<ApiListResponse<VMManager6Recipe>>('GET', '/vm/v3/recipe')
      return response.list || []
    } catch {
      return []
    }
  }

  async getRecipe(id: number): Promise<VMManager6Recipe> {
    return this.request<VMManager6Recipe>('GET', `/vm/v3/recipe/${id}`)
  }

  async getAccounts(): Promise<VMManager6Account[]> {
    const response = await this.request<ApiListResponse<VMManager6Account>>('GET', '/vm/v3/account')
    return response.list || []
  }

  async getAccount(id: number): Promise<VMManager6Account> {
    return this.request<VMManager6Account>('GET', `/vm/v3/account/${id}`)
  }

  async getAccountByEmail(email: string): Promise<VMManager6Account | null> {
    const encodedEmail = encodeURIComponent(email)
    const response = await this.request<ApiListResponse<VMManager6Account>>(
      'GET',
      `/vm/v3/account?where=(email+EQ+'${encodedEmail}')`
    )
    return response.list?.[0] || null
  }

  async createAccount(
    email: string,
    password: string,
    role: string = '@user'
  ): Promise<VMManager6Account> {
    if (!email || !email.includes('@')) {
      throw new VMManager6Error('Invalid email address')
    }

    const response = await this.request<{ id: number }>('POST', '/vm/v3/account', {
      email,
      password,
      role,
    })

    return this.getAccount(response.id)
  }

  async deleteAccount(id: number): Promise<void> {
    await this.request('DELETE', `/vm/v3/account/${id}`)
  }

  hasRole(account: VMManager6Account, role: string, strict: boolean = true): boolean {
    for (const r of account.roles) {
      if (strict) {
        if (r === role) return true
      } else {
        if (r.includes(role)) return true
      }
    }
    return false
  }

  async listVms(filters?: { account?: number; state?: string; cluster?: number; node?: number }): Promise<VMManager6Host[]> {
    let endpoint = '/vm/v3/host'
    const conditions: string[] = []

    if (filters) {
      if (filters.account !== undefined) {
        conditions.push(`(account+EQ+${filters.account})`)
      }
      if (filters.state) {
        conditions.push(`(state+EQ+'${filters.state}')`)
      }
      if (filters.cluster !== undefined) {
        conditions.push(`(cluster+EQ+${filters.cluster})`)
      }
      if (filters.node !== undefined) {
        conditions.push(`(node+EQ+${filters.node})`)
      }
    }

    if (conditions.length > 0) {
      endpoint += `?where=(${conditions.join('+AND+')})`
    }

    const response = await this.request<ApiListResponse<VMManager6Host>>('GET', endpoint)
    return response.list || []
  }

  async getVm(hostId: number): Promise<VMManager6Host> {
    return this.request<VMManager6Host>('GET', `/vm/v3/host/${hostId}`)
  }

  async getVmByFilter(hostId: number): Promise<VMManager6Host | null> {
    const response = await this.request<ApiListResponse<VMManager6Host>>(
      'GET',
      `/vm/v3/host?where=(id+EQ+${hostId})`
    )
    return response.list?.[0] || null
  }

  async getVmIPv6Info(hostId: number): Promise<VMManager6IPv6Info> {
    return this.request<VMManager6IPv6Info>('GET', `/vm/v3/host/${hostId}/ipv6`)
  }

  async getVmDisks(hostId: number): Promise<VMManager6Disk[]> {
    const response = await this.request<ApiListResponse<VMManager6Disk>>('GET', `/vm/v3/host/${hostId}/disk`)
    return response.list || []
  }

  async getVmIPv4(hostId: number): Promise<IPv4Address[]> {
    const response = await this.request<ApiListResponse<IPv4Address>>('GET', `/vm/v3/host/${hostId}/ipv4`)
    return response.list || []
  }

  async createVm(params: CreateHostRequest): Promise<VMManager6Host & { task: string }> {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined)
    )

    console.log('[VMManager6] 🚀 Creating VM with params:', JSON.stringify(cleanParams, null, 2))

    const response = await this.request<VMManager6Host & { task: string }>(
      'POST',
      '/vm/v3/host',
      cleanParams
    )

    console.log('[VMManager6] ✅ VM creation initiated, ID:', response.id, 'Task:', response.task)
    return response
  }

  async createVmAndWait(
    params: CreateHostRequest,
    options?: { waitForOsInstall?: boolean; timeout?: number }
  ): Promise<VMManager6Host> {
    const waitForOsInstall = options?.waitForOsInstall ?? true
    const timeout = options?.timeout || this.taskTimeout

    const createResponse = await this.createVm(params)
    const taskId = createResponse.task
    const hostId = createResponse.id

    if (!taskId) {
      return this.getVm(hostId)
    }

    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      const task = await this.getTask(taskId, 'host_create')

      if (task) {
        if (task.status === 'fail') {
          throw new VMManager6TaskError('VM creation failed', taskId, 'host_create')
        }

        if (task.status === 'complete' || (!waitForOsInstall && task.status === 'running')) {
          return this.getVm(hostId)
        }
      }

      await this.sleep(this.taskPollInterval)
    }

    throw new VMManager6TaskError('VM creation timed out', taskId, 'host_create')
  }

  async startVm(hostId: number): Promise<TaskResponse> {
    return this.request<TaskResponse>('POST', `/vm/v3/host/${hostId}/start`, {})
  }

  async startVmAndWait(hostId: number, timeout?: number): Promise<void> {
    const response = await this.startVm(hostId)
    if (response.task) {
      await this.waitForTask(response.task, 'host_start', { timeout })
    }
  }

  async stopVm(hostId: number): Promise<TaskResponse> {
    return this.request<TaskResponse>('POST', `/vm/v3/host/${hostId}/stop`, {})
  }

  async stopVmAndWait(hostId: number, timeout?: number): Promise<void> {
    const response = await this.stopVm(hostId)
    if (response.task) {
      await this.waitForTask(response.task, 'host_stop', { timeout })
    }
  }

  async restartVm(hostId: number): Promise<TaskResponse> {
    return this.request<TaskResponse>('POST', `/vm/v3/host/${hostId}/restart`, {})
  }

  async restartVmAndWait(hostId: number, timeout?: number): Promise<void> {
    const response = await this.restartVm(hostId)
    const taskId = response.start_task || response.task
    if (taskId) {
      await this.waitForTask(taskId, 'host_start', { timeout })
    }
  }

  async suspendVm(hostId: number): Promise<TaskResponse> {
    return this.stopVm(hostId)
  }

  async suspendVmAndWait(hostId: number, timeout?: number): Promise<void> {
    return this.stopVmAndWait(hostId, timeout)
  }

  async resumeVm(hostId: number): Promise<TaskResponse> {
    return this.startVm(hostId)
  }

  async resumeVmAndWait(hostId: number, timeout?: number): Promise<void> {
    return this.startVmAndWait(hostId, timeout)
  }

  async deleteVm(hostId: number): Promise<TaskResponse> {
    return this.request<TaskResponse>('DELETE', `/vm/v3/host/${hostId}`)
  }

  async deleteVmAndWait(hostId: number, timeout?: number): Promise<void> {
    const response = await this.deleteVm(hostId)
    if (response.task) {
      await this.waitForTask(response.task, 'host_delete', { timeout })
    }
  }

  async changeVmResources(
    hostId: number,
    params: ChangeResourcesRequest
  ): Promise<TaskResponse> {
    return this.request<TaskResponse>('POST', `/vm/v3/host/${hostId}/resource`, params)
  }

  async changeVmIP(hostId: number, params: ChangeIPRequest): Promise<TaskResponse> {
    return this.request<TaskResponse>('POST', `/vm/v3/host/${hostId}/ip`, params)
  }

  async changeVmPassword(hostId: number, password: string): Promise<void> {
    await this.request('POST', `/vm/v3/host/${hostId}/password`, { password })
  }

  async reinstallVm(hostId: number, params: ReinstallRequest): Promise<TaskResponse> {
    return this.request<TaskResponse>('POST', `/vm/v3/host/${hostId}/reinstall`, params)
  }

  async reinstallVmAndWait(hostId: number, params: ReinstallRequest, timeout?: number): Promise<void> {
    const response = await this.reinstallVm(hostId, params)
    if (response.task) {
      await this.waitForTask(response.task, 'host_reinstall', { timeout })
    }
  }

  async resizeDisk(diskId: number, params: ResizeDiskRequest): Promise<TaskResponse> {
    return this.request<TaskResponse>('POST', `/vm/v3/disk/${diskId}`, params)
  }

  async resizeDiskAndWait(diskId: number, params: ResizeDiskRequest, timeout?: number): Promise<void> {
    const response = await this.resizeDisk(diskId, params)
    if (response.task) {
      await this.waitForTask(response.task, 'disk_resize', { timeout })
    }
  }

  async changePTR(ipId: number, domain: string): Promise<void> {
    await this.request('POST', `/vm/v3/ip/${ipId}/ptr`, { domain })
  }

  async getVmMetrics(
    hostId: number,
    target: 'cpu_load' | 'mem_usage' | 'df.root.used' | 'net_rx' | 'net_tx',
    from?: string
  ): Promise<VMManager6Metrics[]> {
    const fromParam = from || this.getMetricsFromDate()
    return this.request<VMManager6Metrics[]>(
      'GET',
      `/vm/v3/host/${hostId}/metrics?target=${target}&from=${fromParam}`
    )
  }

  async getAllVmMetrics(hostId: number, from?: string): Promise<Record<string, VMManager6Metrics[]>> {
    const targets = ['cpu_load', 'mem_usage', 'df.root.used', 'net_rx', 'net_tx'] as const
    const results: Record<string, VMManager6Metrics[]> = {}

    for (const target of targets) {
      try {
        results[target] = await this.getVmMetrics(hostId, target, from)
      } catch {
        results[target] = []
      }
    }

    return results
  }

  async setUserLimits(accountId: number, limits: { vxlan_count_total?: number }): Promise<void> {
    await this.request('POST', `/vm/v3/user_limits/account/${accountId}`, limits)
  }

  async getSsoConfig(): Promise<SSOConfig> {
    try {
      return await this.request<SSOConfig>('GET', '/auth/v4/sso/config')
    } catch {
      return { enabled: false }
    }
  }

  async createUserKey(email: string): Promise<string> {
    const encodedEmail = encodeURIComponent(email)
    const response = await this.request<{ key: string }>(
      'POST',
      `/auth/v4/user/${encodedEmail}/key`,
      {}
    )

    if (!response.key) {
      throw new VMManager6Error('Failed to get auth key')
    }

    return response.key
  }

  async getSsoRedirectUrl(email: string): Promise<string> {
    const key = await this.createUserKey(email)
    return `${this.baseUrl}/auth/key-v4/${key}`
  }

  async exchangeOidcCode(code: string, redirectUri: string): Promise<OIDCTokenResponse> {
    return this.request<OIDCTokenResponse>('POST', '/auth/v4/oidc/token', {
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    })
  }

  async changePackage(
    hostId: number,
    newConfig: {
      cpu_number?: number
      ram_mib?: number
      hdd_mib?: number
      net_bandwidth_mbitps?: number
      os_id?: number
      ipv4_number?: number
      ipv4_pool?: number[]
      ipv6_enabled?: boolean
      ipv6_prefix?: number
    },
    options?: { timeout?: number }
  ): Promise<void> {
    const timeout = options?.timeout || this.taskTimeout

    const vmInfo = await this.getVm(hostId)
    const ipv6Info = await this.getVmIPv6Info(hostId)

    const isActive = vmInfo.state === 'active'

    const currentCpu = vmInfo.cpu_number || vmInfo.cpu
    const currentRam = vmInfo.ram_mib || vmInfo.ram
    const currentNet = vmInfo.net_bandwidth_mbitps || vmInfo.bandwidth || 0
    const currentOsId = typeof vmInfo.os === 'object' ? vmInfo.os.id : vmInfo.os
    const currentIpv4Count = vmInfo.ip4?.length || 0
    const currentIpv6Enabled = ipv6Info.ipv6_enabled
    const currentIpv6Prefix = ipv6Info.ipv6_prefix

    const disk = typeof vmInfo.disk === 'object' ? vmInfo.disk : vmInfo.disk_info
    const currentDiskSize = disk?.disk_mib || disk?.size_mib || vmInfo.disk_mib || 0
    const diskId = disk?.id

    const needDiskResize = newConfig.hdd_mib && diskId && currentDiskSize < newConfig.hdd_mib
    const needHostChange = (
      (newConfig.cpu_number && newConfig.cpu_number !== currentCpu) ||
      (newConfig.ram_mib && newConfig.ram_mib !== currentRam) ||
      (newConfig.net_bandwidth_mbitps && newConfig.net_bandwidth_mbitps !== currentNet)
    )
    const needReinstall = newConfig.os_id && newConfig.os_id !== currentOsId
    const needIpChange = (
      (newConfig.ipv4_number !== undefined && newConfig.ipv4_number !== currentIpv4Count) ||
      (newConfig.ipv6_enabled !== undefined && newConfig.ipv6_enabled !== currentIpv6Enabled) ||
      (newConfig.ipv6_prefix !== undefined && newConfig.ipv6_prefix !== currentIpv6Prefix)
    )

    if (!needDiskResize && !needHostChange && !needReinstall && !needIpChange) {
      return
    }

    const tasks: Array<{ consulId: string; taskName: string }> = []

    if (needDiskResize && diskId) {
      const diskParams: ResizeDiskRequest = { size_mib: newConfig.hdd_mib! }
      if (isActive) {
        diskParams.defer = { action: 'host_stop' }
      }
      const response = await this.resizeDisk(diskId, diskParams)
      if (response.task) {
        tasks.push({ consulId: response.task, taskName: 'disk_resize' })
      }
    }

    if (needHostChange) {
      const hostParams: ChangeResourcesRequest = {}
      if (newConfig.cpu_number) hostParams.cpu_number = newConfig.cpu_number
      if (newConfig.ram_mib) hostParams.ram_mib = newConfig.ram_mib
      if (newConfig.net_bandwidth_mbitps) hostParams.net_bandwidth_mbitps = newConfig.net_bandwidth_mbitps
      if (isActive) {
        hostParams.defer = { action: 'host_stop' }
      }
      const response = await this.changeVmResources(hostId, hostParams)
      if (response.task) {
        tasks.push({ consulId: response.task, taskName: 'host_change_params' })
      }
    }

    if (needIpChange) {
      const ipParams: ChangeIPRequest = {}
      if (newConfig.ipv4_number !== undefined) {
        ipParams.ipv4_number = newConfig.ipv4_number - currentIpv4Count
        if (newConfig.ipv4_pool) {
          ipParams.ipv4_pool = newConfig.ipv4_pool
        }
      }
      if (newConfig.ipv6_enabled !== undefined) {
        ipParams.ipv6_enabled = newConfig.ipv6_enabled
      }
      if (newConfig.ipv6_prefix !== undefined && newConfig.ipv6_enabled) {
        ipParams.ipv6_prefix = newConfig.ipv6_prefix
        ipParams.ipv6_enabled = true
      }
      const response = await this.changeVmIP(hostId, ipParams)
      if (response.task) {
        tasks.push({ consulId: response.task, taskName: 'ip_change' })
      }
    }

    if (isActive && !needReinstall) {
      const response = await this.restartVm(hostId)
      const taskId = response.start_task || response.task
      if (taskId) {
        tasks.push({ consulId: taskId, taskName: 'host_start' })
      }
    }

    if (needReinstall) {
      const response = await this.reinstallVm(hostId, { os: newConfig.os_id })
      if (response.task) {
        tasks.push({ consulId: response.task, taskName: 'host_reinstall' })
      }
    }

    if (tasks.length > 0) {
      await this.waitForTasks(tasks, { timeout })
    }
  }

  async healthCheck(): Promise<{ ok: boolean; latency: number; error?: string }> {
    const startTime = Date.now()
    
    try {
      await this.getNodes()
      return {
        ok: true,
        latency: Date.now() - startTime,
      }
    } catch (error) {
      return {
        ok: false,
        latency: Date.now() - startTime,
        error: (error as Error).message,
      }
    }
  }

  generateSecurePassword(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    const bytes = randomBytes(length)
    let password = ''
    
    for (let i = 0; i < length; i++) {
      password += chars[bytes[i] % chars.length]
    }
    
    const hasUpper = /[A-Z]/.test(password)
    const hasLower = /[a-z]/.test(password)
    const hasDigit = /[0-9]/.test(password)
    const hasSpecial = /[!@#$%^&*]/.test(password)
    
    if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      return this.generateSecurePassword(length)
    }
    
    return password
  }

  private getMetricsFromDate(daysAgo: number = 1): string {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    
    return `${hours}:${minutes}_${year}${month}${day}`
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getBaseUrl(): string {
    return this.baseUrl
  }
}

let apiInstance: VMManager6API | null = null

export function getVMManager6API(): VMManager6API {
  if (!apiInstance) {
    apiInstance = new VMManager6API()
  }
  return apiInstance
}

export function resetVMManager6API(): void {
  apiInstance = null
}

export function createVMManager6API(config: {
  baseUrl: string
  email: string
  password: string
}): VMManager6API {
  return new VMManager6API(config)
}
