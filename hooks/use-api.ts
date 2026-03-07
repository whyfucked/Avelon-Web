import { useState, useEffect, useCallback } from 'react'

export interface User {
  id: string
  email: string
  name: string | null
  balance: number
  role: 'USER' | 'ADMIN'
  pterodactylId: number | null
}

export interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  category: 'MINECRAFT' | 'CODING' | 'VDS'
  ram: number
  cpu: number
  disk: number
  databases: number
  backups: number
  price: number
  eggId: string | null
  egg: { id: string; name: string; nestName: string | null } | null
  mobIcon: string | null
  isActive: boolean
  // VDS-specific fields
  vmPresetId?: number | null
  vmClusterId?: number | null
  vmIpPoolId?: number | null
  vdsCustomSpecs?: string | null
  // Node selection fields
  vmNodeId?: number | null
  vmNodeStrategy?: string | null
}

export interface Node {
  id: string
  name: string
  locationName: string | null
  countryCode: string | null
  priceModifier: number
}

export interface Server {
  id: string
  name: string
  status: 'PENDING' | 'INSTALLING' | 'ACTIVE' | 'SUSPENDED' | 'DELETED'
  pterodactylId: number | null
  pterodactylIdentifier: string | null
  expiresAt: string | null
  createdAt: string
  plan: { id: string; name: string; ram: number; cpu: number; disk: number; price: number }
  egg: { id: string; name: string } | null
  node: { id: string; name: string; locationName: string | null; countryCode: string | null } | null
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (res.ok) {
      setUser(data.user)
      return { success: true }
    }
    return { success: false, error: data.error }
  }

  const register = async (email: string, password: string, name?: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    })
    const data = await res.json()
    if (res.ok) {
      return login(email, password)
    }
    return { success: false, error: data.error }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  return { user, loading, login, register, logout, refetch: fetchUser }
}

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/plans')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPlans(data)
      })
      .finally(() => setLoading(false))
  }, [])

  return { plans, loading }
}

export function useNodes() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/nodes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setNodes(data)
      })
      .finally(() => setLoading(false))
  }, [])

  return { nodes, loading }
}

export function useServers() {
  const [servers, setServers] = useState<Server[]>([])
  const [loading, setLoading] = useState(true)

  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch('/api/servers')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setServers(data)
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchServers()
  }, [fetchServers])

  return { servers, loading, refetch: fetchServers }
}

export async function createServer(params: {
  userId: string
  planId: string
  nodeId: string
  name: string
}): Promise<{ success: boolean; error?: string; server?: any }> {
  try {
    const res = await fetch('/api/servers/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    const data = await res.json()
    if (res.ok) {
      return { success: true, server: data.server }
    }
    return { success: false, error: data.error || data.details }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
