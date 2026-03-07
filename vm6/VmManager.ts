/**
 * VmManager - Основной класс управления виртуальными машинами
 * Объединяет VMManager6API и систему аренд
 */

import {
  VMManager6API,
  getVMManager6API,
  VMManager6Host,
  VMManager6Node,
  VMManager6Cluster,
  VMManager6OS,
  VMManager6Preset,
  VMManager6IPPool,
  CreateHostRequest,
  SSOConfig,
  OIDCTokenResponse
} from './vmmanager6'

import {
  VMManager6Rental,
  CreateVMManager6RentalData,
  UpdateVMManager6RentalData,
  getVMManager6Rentals,
  getVMManager6RentalById,
  getVMManager6RentalByServerId,
  createVMManager6Rental,
  updateVMManager6Rental,
  renewVMManager6Rental,
  getExpiredVMManager6Rentals,
  suspendVMManager6ServerInDatabase,
  deleteVMManager6ServerFromDatabase,
  banVMManager6ServerInDatabase
} from './vmmanager6-rentals'

export interface VmCreateOptions {
  name: string
  osId: number
  password: string
  preset?: number
  cluster?: number
  node?: number
  cpu?: number
  ram?: number
  disk?: number
  ipv4Pool?: number[]
  ipv4Number?: number
  ipv6Pool?: number[]
  ipv6Number?: number
  sshKeys?: number[]
  customNs?: string[]
  comment?: string
  recipe?: number
  tags?: string[]
  domain?: string
}

export interface VmRentalOptions {
  planName: string
  price: number
  days: number
  autoRenew?: boolean
}

export interface VmInfo {
  id: number
  name: string
  status: string
  ip_addresses: string[]
  domain: string | null
  node: number
  cluster: number | null
  os: number
  preset: number | null
  cpu: number
  ram: number
  disk: number
  bandwidth: number | null
  account: number
  created_at: string
  updated_at: string
  comment: string | null
  rescue_mode: boolean
  tags: string[]
}

export interface VmListFilters {
  status?: string
  node?: number
  cluster?: number
  account?: number
}

export interface VmWithRental {
  vm: VmInfo
  rental: VMManager6Rental | null
}

export interface CreateVmResult {
  vm: VmInfo
  rental: VMManager6Rental
  vmAccountId?: number
  vmAccountPassword?: string
  isFirstVds?: boolean
}

export type { VMManager6Rental }

export class VmManager {
  private api: VMManager6API

  constructor() {
    this.api = getVMManager6API()
  }

  /**
   * Получить список нод
   */
  async getNodes(): Promise<VMManager6Node[]> {
    return this.api.getNodes()
  }

  /**
   * Получить список кластеров
   */
  async getClusters(): Promise<VMManager6Cluster[]> {
    return this.api.getClusters()
  }

  /**
   * Получить список ОС образов
   */
  async getOsImages(): Promise<VMManager6OS[]> {
    return this.api.getOsImages()
  }

  /**
   * Получить список пресетов (конфигураций VM)
   */
  async getPresets(): Promise<VMManager6Preset[]> {
    return this.api.getPresets()
  }

  /**
   * Получить пресет по ID
   */
  async getPreset(id: number): Promise<VMManager6Preset> {
    return this.api.getPreset(id)
  }

  /**
   * Получить список IP пулов
   */
  async getIPPools(): Promise<VMManager6IPPool[]> {
    return this.api.getIPPools()
  }

  /**
   * Получить IP пул по ID
   */
  async getIPPool(id: number): Promise<VMManager6IPPool> {
    return this.api.getIPPool(id)
  }

  /**
   * Получить IP пулы для кластера
   */
  async getClusterIPPools(clusterId: number): Promise<VMManager6IPPool[]> {
    return this.api.getClusterIPPools(clusterId)
  }

  /**
   * Валидировать что IP пул подключен к кластеру
   * Возвращает валидный пул ID или undefined
   */
  async validatePoolForCluster(poolId: number, clusterId: number): Promise<number | undefined> {
    try {
      const clusterPools = await this.getClusterIPPools(clusterId)
      const clusterPoolIds = clusterPools.map(p => p.id)
      
      if (clusterPoolIds.includes(poolId)) {
        console.log(`[VmManager] ✅ Pool ${poolId} is valid for cluster ${clusterId}`)
        return poolId
      }
      
      console.warn(`[VmManager] ⚠️ Pool ${poolId} is NOT connected to cluster ${clusterId}`)
      console.warn(`[VmManager] Available pools for cluster ${clusterId}:`, clusterPoolIds)
      
      if (clusterPoolIds.length > 0) {
        console.log(`[VmManager] Using first available pool: ${clusterPoolIds[0]}`)
        return clusterPoolIds[0]
      }
      
      return undefined
    } catch (error) {
      console.error(`[VmManager] Error validating pool ${poolId} for cluster ${clusterId}:`, error)
      return undefined
    }
  }

  /**
   * Получить список всех VM
   */
  async listVms(filters?: VmListFilters): Promise<VmInfo[]> {
    const hosts = await this.api.listVms()
    let result = hosts.map(this.hostToVmInfo)

    if (filters) {
      if (filters.status) {
        result = result.filter(vm => vm.status === filters.status)
      }
      if (filters.node !== undefined) {
        result = result.filter(vm => vm.node === filters.node)
      }
      if (filters.cluster !== undefined) {
        result = result.filter(vm => vm.cluster === filters.cluster)
      }
      if (filters.account !== undefined) {
        result = result.filter(vm => vm.account === filters.account)
      }
    }

    return result
  }

  /**
   * Получить VM конкретного пользователя (по арендам)
   */
  async listUserVms(userId: string): Promise<VmWithRental[]> {
    const rentals = getVMManager6Rentals(userId)
    const results: VmWithRental[] = []

    for (const rental of rentals) {
      try {
        const host = await this.api.getVm(rental.vmmanager6_host_id)
        results.push({
          vm: this.hostToVmInfo(host),
          rental
        })
      } catch (error) {
        console.warn(`[VmManager] Failed to get VM ${rental.vmmanager6_host_id} for user ${userId}:`, error)
        results.push({
          vm: {
            id: rental.vmmanager6_host_id,
            name: 'Unknown (deleted)',
            status: 'deleted',
            ip_addresses: [],
            domain: null,
            node: 0,
            cluster: null,
            os: 0,
            preset: null,
            cpu: 0,
            ram: 0,
            disk: 0,
            bandwidth: null,
            account: rental.vmmanager6_account_id || 0,
            created_at: rental.created_at,
            updated_at: rental.updated_at,
            comment: null,
            rescue_mode: false,
            tags: []
          },
          rental
        })
      }
    }

    return results
  }

  /**
   * Получить информацию о VM
   */
  async getVm(hostId: number): Promise<VmInfo> {
    const host = await this.api.getVm(hostId)
    return this.hostToVmInfo(host)
  }

  /**
   * Получить VM с данными аренды
   */
  async getVmWithRental(hostId: number, userId: string): Promise<VmWithRental> {
    const host = await this.api.getVm(hostId)
    const serverId = `vmmanager6_${hostId}`
    const rental = getVMManager6RentalByServerId(userId, serverId)

    return {
      vm: this.hostToVmInfo(host),
      rental
    }
  }

  /**
   * Создать VM и аренду
   * Создаёт аккаунт в VMManager6, VM и запись аренды
   */
  async createVmWithRental(
    userId: string,
    vmOptions: VmCreateOptions,
    rentalOptions: VmRentalOptions,
    userEmail: string
  ): Promise<CreateVmResult> {
    let vmAccountId: number | undefined
    let vmAccountPassword: string | undefined
    let isFirstVds = false

    const existingRentals = getVMManager6Rentals(userId)
    const hasExistingVds = existingRentals.length > 0
    
    console.log(`[VmManager] User ${userId} has ${existingRentals.length} existing VDS`)

    try {
      const existingAccount = await this.api.getAccountByEmail(userEmail)
      if (existingAccount) {
        vmAccountId = existingAccount.id
        console.log('[VmManager] Using existing VMManager6 account:', vmAccountId, userEmail)
        
        if (!hasExistingVds) {
          isFirstVds = true
        }
      } else {
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
        
        vmAccountPassword = password.split('').sort(() => Math.random() - 0.5).join('')
        
        const account = await this.api.createAccount(userEmail, vmAccountPassword, '@user')
        vmAccountId = account.id
        isFirstVds = true
        console.log('[VmManager] Created new VMManager6 account:', vmAccountId, userEmail)
      }
    } catch (error) {
      console.warn(`[VmManager] Account creation failed, trying to get existing:`, error)
      try {
        const existingAccount = await this.api.getAccountByEmail(userEmail)
        if (existingAccount) {
          vmAccountId = existingAccount.id
          console.log('[VmManager] Found existing VMManager6 account:', vmAccountId)
          
          if (!hasExistingVds) {
            isFirstVds = true
          }
        }
      } catch (e) {
        console.warn('[VmManager] Could not get existing account:', e)
      }
    }

    const createRequest: CreateHostRequest = {
      name: vmOptions.name,
      os: vmOptions.osId,
      password: vmOptions.password,
      preset: vmOptions.preset,
      cluster: vmOptions.cluster,
      node: vmOptions.node,
      cpu_number: vmOptions.cpu,
      ram_mib: vmOptions.ram,
      hdd_mib: vmOptions.disk,
      ipv4_pool: vmOptions.ipv4Pool,
      ipv4_number: vmOptions.ipv4Number,
      ipv6_pool: vmOptions.ipv6Pool,
      ipv6_number: vmOptions.ipv6Number,
      ssh_keys: vmOptions.sshKeys,
      custom_ns: vmOptions.customNs,
      comment: vmOptions.comment,
      recipe: vmOptions.recipe,
      tags: vmOptions.tags,
      domain: vmOptions.domain,
      account: vmAccountId
    }

    Object.keys(createRequest).forEach(key => {
      if (createRequest[key as keyof CreateHostRequest] === undefined) {
        delete createRequest[key as keyof CreateHostRequest]
      }
    })

    console.log('[VmManager] Creating VM with request:', JSON.stringify(createRequest, null, 2))

    const host = await this.api.createVm(createRequest)
    
    console.log('[VmManager] VM created with ID:', host.id, 'Task:', (host as any).task, 'State:', host.state)

    const rentalData: CreateVMManager6RentalData = {
      user_id: userId,
      vmmanager6_host_id: host.id,
      vmmanager6_account_id: vmAccountId,
      plan_name: rentalOptions.planName,
      rental_price: rentalOptions.price,
      rental_days: rentalOptions.days,
      auto_renew: rentalOptions.autoRenew
    }

    const rental = createVMManager6Rental(rentalData)

    return {
      vm: this.hostToVmInfo(host),
      rental,
      vmAccountId,
      vmAccountPassword,
      isFirstVds
    }
  }

  /**
   * Запустить VM
   */
  async startVm(hostId: number): Promise<void> {
    await this.api.startVm(hostId)
  }

  /**
   * Остановить VM
   */
  async stopVm(hostId: number): Promise<void> {
    await this.api.stopVm(hostId)
  }

  /**
   * Перезапустить VM
   */
  async restartVm(hostId: number): Promise<void> {
    await this.api.restartVm(hostId)
  }

  /**
   * Приостановить VM
   */
  async suspendVm(hostId: number): Promise<void> {
    await this.api.suspendVm(hostId)
    suspendVMManager6ServerInDatabase(hostId)
  }

  /**
   * Возобновить VM
   */
  async resumeVm(hostId: number): Promise<void> {
    await this.api.resumeVm(hostId)
  }

  /**
   * Удалить VM
   */
  async deleteVm(hostId: number): Promise<void> {
    await this.api.deleteVm(hostId)
    deleteVMManager6ServerFromDatabase(hostId)
  }

  /**
   * Заблокировать VM
   */
  async banVm(hostId: number, reason?: string): Promise<void> {
    await this.api.suspendVm(hostId)
    banVMManager6ServerInDatabase(hostId)
    
    if (reason) {
      console.log(`[VmManager] VM ${hostId} banned. Reason: ${reason}`)
    }
  }

  /**
   * Продлить аренду
   */
  renewRental(userId: string, hostId: number, days: number): VMManager6Rental | null {
    const serverId = `vmmanager6_${hostId}`
    const rental = getVMManager6RentalByServerId(userId, serverId)
    
    if (!rental) {
      return null
    }

    return renewVMManager6Rental(rental.id, days)
  }

  /**
   * Обновить настройки аренды
   */
  updateRental(
    userId: string,
    hostId: number,
    updates: Partial<UpdateVMManager6RentalData>
  ): VMManager6Rental | null {
    const serverId = `vmmanager6_${hostId}`
    const rental = getVMManager6RentalByServerId(userId, serverId)
    
    if (!rental) {
      return null
    }

    return updateVMManager6Rental(rental.id, updates)
  }

  /**
   * Получить истёкшие аренды
   */
  getExpiredRentals(): VMManager6Rental[] {
    return getExpiredVMManager6Rentals()
  }

  /**
   * Получить SSO конфигурацию
   */
  async getSsoConfig(): Promise<SSOConfig> {
    return this.api.getSsoConfig()
  }

  /**
   * Обменять код на токен
   */
  async exchangeOidcCode(code: string, redirectUri: string): Promise<OIDCTokenResponse> {
    return this.api.exchangeOidcCode(code, redirectUri)
  }

  /**
   * Получить URL для SSO редиректа пользователя
   */
  async getSsoRedirectUrl(userEmail: string): Promise<string> {
    return this.api.getSsoRedirectUrl(userEmail)
  }

  /**
   * Изменить конфигурацию VM (upgrade/downgrade)
   */
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
    }
  ): Promise<void> {
    return this.api.changePackage(hostId, newConfig)
  }

  /**
   * Изменить пароль VM
   */
  async changeVmPassword(hostId: number, password: string): Promise<void> {
    return this.api.changeVmPassword(hostId, password)
  }

  /**
   * Переустановить ОС на VM
   */
  async reinstallVm(hostId: number, osId: number, password?: string): Promise<void> {
    await this.api.reinstallVmAndWait(hostId, { os: osId, password })
  }

  /**
   * Получить метрики VM
   */
  async getVmMetrics(hostId: number): Promise<Record<string, any>> {
    return this.api.getAllVmMetrics(hostId)
  }

  /**
   * Проверить здоровье VMManager6
   */
  async healthCheck(): Promise<{ ok: boolean; latency: number; error?: string }> {
    return this.api.healthCheck()
  }

  /**
   * Преобразование VMManager6Host в VmInfo
   * Стандартизированное извлечение данных из VMManager6 API
   */
  private hostToVmInfo(host: VMManager6Host): VmInfo {
    const ipAddresses: string[] = []
    
    if (Array.isArray(host.ip4)) {
      for (const ip of host.ip4) {
        const addr = ip.ip || ip.name
        if (addr) ipAddresses.push(addr)
      }
    }
    
    if (Array.isArray(host.ip6)) {
      for (const ip of host.ip6) {
        const addr = ip.ip || ip.name
        if (addr) ipAddresses.push(addr)
      }
    }
    
    if (Array.isArray(host.ip) && ipAddresses.length === 0) {
      for (const ip of host.ip) {
        const addr = (ip as any).ip || ip.name
        if (addr) ipAddresses.push(addr)
      }
    }

    const osId = typeof host.os === 'object' ? host.os.id : host.os
    const cpuValue = host.cpu_number || host.cpu || 0
    const ramValue = host.ram_mib || host.ram || 0
    
    let diskValue = 0
    
    if (typeof host.disk === 'object' && host.disk !== null) {
      diskValue = (host.disk as any).size_mib || (host.disk as any).disk_mib || 0
    }
    else if (host.disk_info && typeof host.disk_info === 'object') {
      diskValue = (host.disk_info as any).size_mib || 0
    }
    else if (host.disk_mib) {
      diskValue = host.disk_mib
    }
    else if (typeof host.disk === 'number') {
      diskValue = host.disk > 1000 ? host.disk : host.disk * 1024
    }
    
    const bandwidthValue = host.net_bandwidth_mbitps || host.bandwidth || null

    return {
      id: host.id,
      name: host.name,
      status: host.state,
      ip_addresses: ipAddresses,
      domain: host.domain,
      node: host.node,
      cluster: host.cluster,
      os: osId,
      preset: host.preset,
      cpu: cpuValue,
      ram: ramValue,
      disk: diskValue,
      bandwidth: bandwidthValue,
      account: host.account,
      created_at: host.created_at,
      updated_at: host.updated_at,
      comment: host.comment,
      rescue_mode: host.rescue_mode,
      tags: host.tags || []
    }
  }

  /**
   * Генерация безопасного пароля
   * Использует криптографически безопасный генератор из API клиента
   */
  private generateSecurePassword(length: number = 16): string {
    return this.api.generateSecurePassword(length)
  }
}

let vmManagerInstance: VmManager | null = null

/**
 * Получение singleton экземпляра VmManager
 */
export function getVmManager(): VmManager {
  if (!vmManagerInstance) {
    vmManagerInstance = new VmManager()
  }
  return vmManagerInstance
}
