export const locationFlags: Record<string, string> = {
  de: "/de.png",
  fr: "/fr.png",
  ru: "/ru.png",
  nl: "/nl.png",
  ua: "/ua.png",
  br: "/br.png",
  fi: "/finland.png",
}

export const currencies = {
  "₽": { symbol: "₽", rate: 1, name: "Рубль" },
  "$": { symbol: "$", rate: 0.011, name: "Доллар" },
  "€": { symbol: "€", rate: 0.010, name: "Евро" },
  "₴": { symbol: "₴", rate: 0.45, name: "Гривна" },
}

export type Currency = keyof typeof currencies
export type Tab = "servers" | "create" | "billing" | "settings"

export interface User {
  id: string
  email: string
  name: string | null
  balance: number
  role: string
  emailVerified: boolean
}

export interface ServerData {
  id: string
  name: string
  status: string
  pterodactylId: number | null
  pterodactylIdentifier: string | null
  expiresAt: string | null
  paidAmount: number | null
  startupCommand: string | null
  startupPreset: string | null
  plan: { id: string; name: string; ram: number; cpu: number; disk: number; price: number; isFree?: boolean; category?: string }
  node: { id: string; name: string; locationName: string | null; countryCode: string | null; priceModifier?: number } | null
}

export interface Plan {
  id: string
  name: string
  slug: string
  category: string
  ram: number
  cpu: number
  disk: number
  price: number
  isFree: boolean
  mobIcon: string | null
  customIcon: string | null
  egg: { id: string; name: string } | null
  eggOptions?: {
    id: string
    eggId: string
    egg: { id: string; name: string } | null
  }[]
  // VDS-specific fields
  vmPresetId?: number | null
  vmClusterId?: number | null
  vmIpPoolId?: number | null
  vdsCustomSpecs?: string | null
  // Node selection fields
  vmNodeId?: number | null
  vmNodeStrategy?: string | null
}

// VDS Plan - отдельный интерфейс для VDS тарифов
export interface VdsPlan {
  id: string
  name: string
  slug: string
  description?: string | null
  price: number
  // Характеристики из VMManager6 пресета
  cpu: number      // количество ядер
  ram: number      // RAM в MB
  disk: number     // Диск в GB
  bandwidth?: number | null  // Трафик в MB/s
  // VMManager6 IDs
  vmPresetId: number | null
  vmClusterId: number | null
  vmIpPoolId: number | null
  customIcon: string | null
  isActive: boolean
  // Дополнительные параметры
  cpuModel?: string | null
  location?: string | null
  vdsType?: 'STANDARD' | 'PROMO'
  vdsLocation?: 'DE' | 'RU'
  city?: string | null
  country?: string | null
  // Node selection fields
  vmNodeId?: number | null
  vmNodeStrategy?: string | null
}

export interface Node {
  id: string
  name: string
  locationName: string | null
  countryCode: string | null
  isFree: boolean
  priceModifier: number
  memory?: number | null
  disk?: number | null
  _count?: { servers: number }
  hasAllocations?: boolean
  nodeType?: 'MINECRAFT' | 'CODING'
}

export interface VdsOsImage {
  id: string
  vmManagerId: number
  name: string
}

export interface VdsCluster {
  id: string
  vmManagerId: number
  name: string
  countryCode: string | null
}

export interface VdsServer {
  id: string
  vmmanager6_host_id: number
  name: string
  status: string
  ip_addresses?: string[]
  ip_address?: string | null
  os?: number
  osName?: string
  ram?: number
  cpu?: number
  disk?: number
  panelUrl?: string
  expiresAt?: string
  planName?: string
  price?: number
  autoRenew?: boolean
  rentalStatus?: string
}


export interface OtherService {
  id: string
  name: string
  type: 'dedicated' | 'domain' | 'storagebox'
  status: string
  expiresAt: string | null
  gracePeriodEnd: string | null
  paidAmount: number | null
  createdAt: string
  // Dedicated
  ipAddress?: string
  rootPassword?: string
  specs?: string
  // Domain
  registrar?: string
  // StorageBox
  ftpHost?: string
  ftpUser?: string
  ftpPassword?: string
  sizeGB?: number
}
