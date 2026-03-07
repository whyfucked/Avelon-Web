const PTERODACTYL_URL = process.env.PTERODACTYL_URL
const PTERODACTYL_API_KEY = process.env.PTERODACTYL_API_KEY

interface PterodactylResponse<T> {
  object: string
  attributes: T
}

interface PterodactylListResponse<T> {
  object: string
  data: Array<{ object: string; attributes: T }>
  meta?: {
    pagination: {
      total: number
      count: number
      per_page: number
      current_page: number
      total_pages: number
    }
  }
}

export interface PterodactylEgg {
  id: number
  uuid: string
  name: string
  nest: number
  description: string
  docker_image: string
  docker_images: Record<string, string>
  startup: string
}

export interface PterodactylNode {
  id: number
  uuid: string
  name: string
  fqdn: string
  location_id: number
  memory: number
  memory_overallocate: number
  disk: number
  disk_overallocate: number
  allocated_resources?: {
    memory: number
    disk: number
  }
}

export interface PterodactylLocation {
  id: number
  short: string
  long: string
}

export interface PterodactylNest {
  id: number
  uuid: string
  name: string
  description: string
}


export interface PterodactylUser {
  id: number
  uuid: string
  username: string
  email: string
  first_name: string
  last_name: string
}

export interface PterodactylServer {
  id: number
  uuid: string
  identifier: string
  name: string
  description: string
  status: 'online' | 'offline' | 'suspended' | null
  current_state: 'running' | 'stopped' | 'starting' | 'stopping' | 'restarting' | 'installing' | 'reinstalling' | null
  suspended: boolean
  limits: {
    memory: number
    swap: number
    disk: number
    io: number
    cpu: number
  }
  user: number
  node: number
  allocation: number
}

export interface PterodactylAllocation {
  id: number
  ip: string
  port: number
  assigned: boolean
}

async function pterodactylFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!PTERODACTYL_URL || !PTERODACTYL_API_KEY) {
    throw new Error('Pterodactyl URL or API key not configured')
  }

  const url = `${PTERODACTYL_URL}/api/application${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${PTERODACTYL_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `Pterodactyl API error: ${response.status}`
    
    if (errorText.includes('<!DOCTYPE html>') && (errorText.includes('Cloudflare') || errorText.includes('Just a moment'))) {
      errorMessage = `Pterodactyl is protected by Cloudflare. Please disable Cloudflare protection for API endpoints or whitelist your server IP.`
      console.error('[Pterodactyl] Cloudflare protection detected')
      throw new Error(errorMessage)
    }
    
    try {
      const errorJson = JSON.parse(errorText)
      if (errorJson.errors) {
        errorMessage = errorJson.errors.map((e: any) => e.detail).join(', ')
      }
      console.error('[Pterodactyl Error] Full response:', JSON.stringify(errorJson, null, 2))
    } catch {
      errorMessage += ` - ${errorText.substring(0, 200)}`
      console.error('[Pterodactyl Error] Raw response:', errorText.substring(0, 500))
    }
    throw new Error(errorMessage)
  }

  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

export async function getNodes(): Promise<PterodactylNode[]> {
  const response = await pterodactylFetch<PterodactylListResponse<PterodactylNode>>('/nodes?include=allocations')
  return response.data.map(item => item.attributes)
}

export async function getNode(nodeId: number): Promise<PterodactylNode> {
  const response = await pterodactylFetch<PterodactylResponse<PterodactylNode>>(`/nodes/${nodeId}`)
  return response.attributes
}

export async function getNodeAllocations(nodeId: number): Promise<PterodactylAllocation[]> {
  const response = await pterodactylFetch<PterodactylListResponse<PterodactylAllocation>>(`/nodes/${nodeId}/allocations`)
  return response.data.map(item => item.attributes)
}

export async function getLocations(): Promise<PterodactylLocation[]> {
  const response = await pterodactylFetch<PterodactylListResponse<PterodactylLocation>>('/locations')
  return response.data.map(item => item.attributes)
}

export async function getNests(): Promise<PterodactylNest[]> {
  const response = await pterodactylFetch<PterodactylListResponse<PterodactylNest>>('/nests')
  return response.data.map(item => item.attributes)
}

export async function getEggs(nestId: number): Promise<PterodactylEgg[]> {
  const response = await pterodactylFetch<PterodactylListResponse<PterodactylEgg>>(`/nests/${nestId}/eggs?include=variables`)
  return response.data.map(item => item.attributes)
}

export async function getAllEggs(): Promise<(PterodactylEgg & { nestName: string })[]> {
  const nests = await getNests()
  const allEggs: (PterodactylEgg & { nestName: string })[] = []
  
  for (const nest of nests) {
    const eggs = await getEggs(nest.id)
    allEggs.push(...eggs.map(egg => ({ ...egg, nestName: nest.name })))
  }
  
  return allEggs
}

export async function getEgg(nestId: number, eggId: number): Promise<PterodactylEgg> {
  const response = await pterodactylFetch<PterodactylResponse<PterodactylEgg>>(`/nests/${nestId}/eggs/${eggId}?include=variables`)
  return response.attributes
}

export async function getPterodactylUsers(): Promise<PterodactylUser[]> {
  const response = await pterodactylFetch<PterodactylListResponse<PterodactylUser>>('/users')
  return response.data.map(item => item.attributes)
}

export async function getPterodactylUser(userId: number): Promise<PterodactylUser> {
  const response = await pterodactylFetch<PterodactylResponse<PterodactylUser>>(`/users/${userId}`)
  return response.attributes
}

export async function findPterodactylUserByEmail(email: string): Promise<PterodactylUser | null> {
  try {
    const response = await pterodactylFetch<PterodactylListResponse<PterodactylUser>>(`/users?filter[email]=${encodeURIComponent(email)}`)
    if (response.data.length > 0) {
      return response.data[0].attributes
    }
    return null
  } catch {
    return null
  }
}

export async function createPterodactylUser(params: {
  email: string
  username: string
  firstName: string
  lastName: string
  password?: string
}): Promise<PterodactylUser> {
  const response = await pterodactylFetch<PterodactylResponse<PterodactylUser>>('/users', {
    method: 'POST',
    body: JSON.stringify({
      email: params.email,
      username: params.username,
      first_name: params.firstName,
      last_name: params.lastName,
      password: params.password,
    }),
  })
  return response.attributes
}

export async function updatePterodactylUserPassword(userId: number, password: string): Promise<PterodactylUser> {
  console.log('[Pterodactyl] Updating password for user:', userId)
  
  const user = await getPterodactylUser(userId)
  console.log('[Pterodactyl] Got user:', user.username, user.email)
  
  const updateData = {
    email: user.email,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    language: 'en',
    password: password,
  }
  
  console.log('[Pterodactyl] Sending update request...')
  
  const response = await pterodactylFetch<PterodactylResponse<PterodactylUser>>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(updateData),
  })
  
  console.log('[Pterodactyl] Password updated successfully for user:', response.attributes.username)
  return response.attributes
}

export async function getPterodactylServers(): Promise<PterodactylServer[]> {
  const response = await pterodactylFetch<PterodactylListResponse<PterodactylServer>>('/servers')
  return response.data.map(item => item.attributes)
}

export async function getPterodactylServer(serverId: number): Promise<PterodactylServer> {
  const response = await pterodactylFetch<PterodactylResponse<PterodactylServer>>(`/servers/${serverId}`)
  return response.attributes
}

export async function getPterodactylServerStatus(uuid: string): Promise<{ state: string; is_suspended: boolean }> {
  const PTERODACTYL_URL = process.env.PTERODACTYL_URL
  const PTERODACTYL_CLIENT_KEY = process.env.PTERODACTYL_CLIENT_KEY
  
  if (!PTERODACTYL_URL || !PTERODACTYL_CLIENT_KEY) {
    throw new Error('Pterodactyl client credentials not configured')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${PTERODACTYL_URL}/api/client/servers/${uuid}/resources`, {
      headers: {
        'Authorization': `Bearer ${PTERODACTYL_CLIENT_KEY}`,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    console.log(`[Pterodactyl] Response status for ${uuid}: ${response.status}`)

    if (response.status === 409) {
      console.log(`[Pterodactyl] Server ${uuid} is still installing (409)`)
      return {
        state: 'installing',
        is_suspended: false,
      }
    }

    if (!response.ok) {
      if (response.status === 404) {
        return {
          state: 'offline',
          is_suspended: false,
        }
      }
      if (response.status === 504 || response.status === 502 || response.status === 503) {
        console.log(`[Pterodactyl] Server ${uuid} timeout/unavailable (${response.status})`)
        return {
          state: 'unknown',
          is_suspended: false,
        }
      }
      throw new Error(`Failed to get server status: ${response.status}`)
    }

    const data = await response.json()
    return {
      state: data.attributes?.current_state || null,
      is_suspended: data.attributes?.is_suspended || false,
    }
  } catch (error: any) {
    clearTimeout(timeoutId)
    
    if (error.name === 'AbortError') {
      console.log(`[Pterodactyl] Request timeout for ${uuid}`)
      return {
        state: 'unknown',
        is_suspended: false,
      }
    }
    
    throw error
  }
}


export async function createServer(params: {
  name: string
  userId: number
  eggId: number
  nestId: number
  nodeId: number
  allocationId: number
  ram: number
  cpu: number
  disk: number
  databases: number
  backups: number
  allocations: number
  dockerImage: string
  startup: string
  environment: Record<string, string>
}): Promise<PterodactylServer> {
  const requestBody = {
    name: params.name,
    user: params.userId,
    egg: params.eggId,
    docker_image: params.dockerImage,
    startup: params.startup,
    environment: params.environment,
    limits: {
      memory: params.ram,
      swap: 0,
      disk: params.disk,
      io: 500,
      cpu: params.cpu,
    },
    feature_limits: {
      databases: params.databases,
      backups: params.backups,
      allocations: params.allocations,
    },
    allocation: {
      default: params.allocationId,
    },
  }
  
  console.log('[Pterodactyl] Creating server with params:', {
    name: params.name,
    userId: params.userId,
    eggId: params.eggId,
    nodeId: params.nodeId,
    allocationId: params.allocationId,
    ram: params.ram,
    cpu: params.cpu,
    disk: params.disk,
  })
  
  try {
    const response = await pterodactylFetch<PterodactylResponse<PterodactylServer>>('/servers', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })
    console.log('[Pterodactyl] Server created successfully:', response.attributes.id)
    return response.attributes
  } catch (error) {
    console.error('[Pterodactyl] Failed to create server:', error)
    throw error
  }
}

export async function deleteServer(serverId: number, force: boolean = false): Promise<void> {
  const endpoint = force ? `/servers/${serverId}/force` : `/servers/${serverId}`
  await pterodactylFetch(endpoint, { method: 'DELETE' })
}

export async function suspendServer(serverId: number): Promise<void> {
  await pterodactylFetch(`/servers/${serverId}/suspend`, { method: 'POST' })
}

export async function unsuspendServer(serverId: number): Promise<void> {
  await pterodactylFetch(`/servers/${serverId}/unsuspend`, { method: 'POST' })
}

export async function reinstallServer(serverId: number): Promise<void> {
  await pterodactylFetch(`/servers/${serverId}/reinstall`, { method: 'POST' })
}

export async function updateServerBuild(serverId: number, params: {
  ram?: number
  cpu?: number
  disk?: number
  databases?: number
  backups?: number
  allocations?: number
  allocationId?: number
}): Promise<PterodactylServer> {
  const response = await pterodactylFetch<PterodactylResponse<PterodactylServer>>(`/servers/${serverId}/build`, {
    method: 'PATCH',
    body: JSON.stringify({
      allocation: params.allocationId,
      limits: {
        memory: params.ram,
        swap: 0,
        disk: params.disk,
        io: 500,
        cpu: params.cpu,
      },
      feature_limits: {
        databases: params.databases,
        backups: params.backups,
        allocations: params.allocations,
      },
    }),
  })
  return response.attributes
}

export async function testConnection(): Promise<{ connected: boolean; error?: string; nodesCount?: number }> {
  try {
    if (!PTERODACTYL_URL) {
      return { connected: false, error: 'PTERODACTYL_URL не настроен в .env' }
    }
    if (!PTERODACTYL_API_KEY) {
      return { connected: false, error: 'PTERODACTYL_API_KEY не настроен в .env' }
    }
    
    const nodes = await getNodes()
    return { connected: true, nodesCount: nodes.length }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Pterodactyl] Connection test failed:', errorMessage)
    return { connected: false, error: errorMessage }
  }
}

export async function findFreeAllocation(nodeId: number): Promise<PterodactylAllocation | null> {
  try {
    const allocations = await getNodeAllocations(nodeId)
    
    if (allocations.length === 0) {
      throw new Error('Node has no allocations configured')
    }
    
    return allocations.find(a => !a.assigned) || null
  } catch (error) {
    throw error
  }
}

export async function getNodeStats(nodeId: number): Promise<{
  memory: { total: number; used: number; free: number }
  disk: { total: number; used: number; free: number }
}> {
  const node = await getNode(nodeId)
  
  const usedMemory = node.allocated_resources?.memory || 0
  const usedDisk = node.allocated_resources?.disk || 0
  
  const totalMemory = node.memory + (node.memory * node.memory_overallocate / 100)
  const totalDisk = node.disk + (node.disk * node.disk_overallocate / 100)
  
  return {
    memory: {
      total: totalMemory,
      used: usedMemory,
      free: totalMemory - usedMemory,
    },
    disk: {
      total: totalDisk,
      used: usedDisk,
      free: totalDisk - usedDisk,
    },
  }
}