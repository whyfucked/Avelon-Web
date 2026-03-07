export type Tab = "dashboard" | "users" | "servers" | "plans" | "pterodactyl" | "vmmanager" | "status" | "smtp" | "settings"

export interface User {
  id: string
  email: string
  name: string | null
  balance: number
  role: string
  pterodactylId: number | null
  createdAt: string
  _count: { servers: number; transactions: number }
}

export interface Egg {
  id: string
  pterodactylId: number
  nestId: number
  nestName: string | null
  name: string
  description: string | null
  dockerImage: string | null
  isActive: boolean
  _count: { servers: number; plans: number }
}

export interface Node {
  id: string
  pterodactylId: number
  name: string
  fqdn: string | null
  locationName: string | null
  countryCode: string | null
  memory: number | null
  disk: number | null
  isActive: boolean
  isFree: boolean
  allowCreation: boolean
  priceModifier: number
  nodeType: 'MINECRAFT' | 'CODING'
  _count: { servers: number }
}

export interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  category: string
  ram: number
  cpu: number
  disk: number
  databases: number
  backups: number
  price: number
  isFree: boolean
  eggId: string | null
  egg: Egg | null
  mobIcon: string | null
  customIcon?: string | null
  isActive: boolean
  sortOrder: number
  _count: { servers: number }
  eggOptions?: { id: string; eggId: string; egg: Egg }[]
  // VDS fields
  vmPresetId?: number | null
  vmClusterId?: number | null
  vmIpPoolId?: number | null
  vdsCustomSpecs?: string | null
  // Node selection fields
  vmNodeId?: number | null
  vmNodeStrategy?: string | null
}

export interface ServerData {
  id: string
  name: string
  status: string
  pterodactylId: number | null
  pterodactylIdentifier: string | null
  expiresAt: string | null
  createdAt: string
  user: { id: string; email: string; name: string | null }
  plan: { id: string; name: string; price: number }
  node: { id: string; name: string; locationName: string | null } | null
  egg: { id: string; name: string } | null
}

export interface PromoCode {
  id: string
  code: string
  type: 'DISCOUNT' | 'BALANCE'
  value: number
  maxUses: number | null
  usedCount: number
  minAmount: number | null
  expiresAt: string | null
  isActive: boolean
  createdAt: string
  _count: { usages: number }
}

export interface ServiceStatus {
  id: string
  name: string
  type: 'WEB' | 'GAME' | 'NODE' | 'ROUTER'
  isSystem: boolean
  url: string | null
  nodeId: string | null
  node: Node | null
  isOnline: boolean
  lastCheck: string
  responseTime: number | null
  sortOrder: number
  history: { isOnline: boolean; responseTime: number | null; checkedAt: string }[]
}

export interface SmtpSettings {
  host: string
  port: string
  user: string
  password: string
  from: string
  secure: boolean
}

export const statusColors: Record<string, string> = { 
  PENDING: 'bg-amber-500/20 text-amber-500', 
  INSTALLING: 'bg-amber-500/20 text-amber-500', 
  ACTIVE: 'bg-emerald-500/20 text-emerald-500', 
  SUSPENDED: 'bg-amber-500/20 text-amber-500', 
  OFF: 'bg-red-500/20 text-red-500',
  RESTARTING: 'bg-blue-500/20 text-blue-500',
  DELETED: 'bg-gray-500/20 text-gray-500' 
}

export const statusLabels: Record<string, string> = {
  PENDING: 'Ожидание',
  INSTALLING: 'Установка',
  ACTIVE: 'Онлайн',
  SUSPENDED: 'Отключен',
  OFF: 'Выключен',
  RESTARTING: 'Перезагружается',
  DELETED: 'Удален'
}

export const formatBytes = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`
