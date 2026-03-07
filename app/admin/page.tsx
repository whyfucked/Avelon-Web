"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { notify } from "@/lib/notify"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { 
  Settings, Users, Server, CreditCard, Database, RefreshCw,
  CheckCircle, XCircle, Plus, Trash2, Edit, Save, X, Eye, EyeOff,
  Globe, Cpu, HardDrive, MemoryStick, Link2, Unlink, Home, Search,
  Zap, Shield, LogOut, Wallet, AlertCircle,
  Activity, Cloud, Mail, FileText, BarChart3, Heart, Target
} from "lucide-react"
import { SettingsTab } from "@/components/admin/settings-tab"
import { CustomSelect } from "@/components/admin/custom-select"
import { StatusSelect } from "@/components/ui/status-select"
import { AdminLogsTable } from "./_components/admin-logs-table"
import { ServiceManager } from "./_components/service-manager"

type Tab = "dashboard" | "users" | "servers" | "plans" | "pterodactyl" | "vmmanager" | "dedicated" | "domains" | "storagebox" | "status" | "smtp" | "logs" | "settings"

interface User {
  id: string
  email: string
  name: string | null
  balance: number
  role: string
  pterodactylId: number | null
  emailVerified: boolean
  createdAt: string
  _count: { servers: number; transactions: number }
}

interface Egg {
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

interface Node {
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

interface Plan {
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
  vmNodeId?: number | null
  vmNodeStrategy?: string | null
  vmIpPoolId?: number | null
  vdsCustomSpecs?: string | null
}

interface ServerData {
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

interface PromoCode {
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

interface ServiceStatus {
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

export default function AdminPage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("dashboard")
  const [pterodactylConnected, setPterodactylConnected] = useState<boolean | null>(null)
  const [pterodactylError, setPterodactylError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [servers, setServers] = useState<ServerData[]>([])
  const [eggs, setEggs] = useState<Egg[]>([])
  const [nodes, setNodes] = useState<Node[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [showNewPromo, setShowNewPromo] = useState(false)
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null)
  const [globalDiscount, setGlobalDiscount] = useState(0)
  const [snowEnabled, setSnowEnabled] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [serverCreationDisabled, setServerCreationDisabled] = useState(false)
  const [vdsCoreLimit, setVdsCoreLimit] = useState(100)
  const [vdsCurrentCores, setVdsCurrentCores] = useState(0)
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([])
  const [checkingStatuses, setCheckingStatuses] = useState(false)
  const [showNewStatus, setShowNewStatus] = useState(false)
  const [editingStatus, setEditingStatus] = useState<ServiceStatus | null>(null)
  const [syncingStatuses, setSyncingStatuses] = useState(false)
  
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editingUserForm, setEditingUserForm] = useState({ name: '', email: '', newPassword: '', balance: 0, role: 'USER' })
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [showNewPlan, setShowNewPlan] = useState(false)
  const [editingNode, setEditingNode] = useState<Node | null>(null)
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('')
  const [selectedNodeType, setSelectedNodeType] = useState<'MINECRAFT' | 'CODING'>('MINECRAFT')
  
  // SMTP state
  const [smtpSettings, setSmtpSettings] = useState({
    host: '',
    port: '587',
    user: '',
    password: '',
    from: '',
    secure: false,
  })
  const [smtpTestEmail, setSmtpTestEmail] = useState('')
  const [smtpTesting, setSmtpTesting] = useState(false)
  const [smtpSaving, setSmtpSaving] = useState(false)

  // VMManager state
  const [vmConnected, setVmConnected] = useState<boolean | null>(null)
  const [vmError, setVmError] = useState<string | null>(null)
  const [vmSyncing, setVmSyncing] = useState(false)
  const [vmHosts, setVmHosts] = useState<any[]>([])
  const [vmNodes, setVmNodes] = useState<any[]>([])
  const [vmOsImages, setVmOsImages] = useState<any[]>([])
  const [vmClusters, setVmClusters] = useState<any[]>([])
  const [vmPresets, setVmPresets] = useState<any[]>([])
  const [vmIpPools, setVmIpPools] = useState<any[]>([])
  const [vmRentals, setVmRentals] = useState<any[]>([])
  const [vmExpiredCount, setVmExpiredCount] = useState(0)
  const [vmActionLoading, setVmActionLoading] = useState<number | null>(null)
  const [discordWebhook, setDiscordWebhook] = useState('')
  
  // Plan form state for VDS category
  const [planCategory, setPlanCategory] = useState<string>('MINECRAFT')
  
  // Plan form select states
  const [planFormPreset, setPlanFormPreset] = useState<string>('')
  const [planFormCluster, setPlanFormCluster] = useState<string>('')
  const [planFormNode, setPlanFormNode] = useState<string>('')
  const [planFormNodeStrategy, setPlanFormNodeStrategy] = useState<string>('auto')
  const [planFormIpPool, setPlanFormIpPool] = useState<string>('')
  const [planFormStatus, setPlanFormStatus] = useState<string>('true')
  const [planFormVdsType, setPlanFormVdsType] = useState<string>('STANDARD') // VDS или PROMO
  const [planFormVdsLocation, setPlanFormVdsLocation] = useState<string>('DE') // DE или RU
  const [planFormCpuModel, setPlanFormCpuModel] = useState<string>('') // Модель процессора
  const [planFormCity, setPlanFormCity] = useState<string>('') // Город
  const [planFormCountry, setPlanFormCountry] = useState<string>('') // Страна

  const navItems = [
    { id: "dashboard" as Tab, icon: Home, label: "Обзор" },
    { id: "users" as Tab, icon: Users, label: "Пользователи" },
    { id: "servers" as Tab, icon: Server, label: "Серверы" },
    { id: "plans" as Tab, icon: CreditCard, label: "Тарифы" },
    { id: "pterodactyl" as Tab, icon: Database, label: "Pterodactyl" },
    { id: "vmmanager" as Tab, icon: Cloud, label: "VmManager" },
    { id: "dedicated" as Tab, icon: HardDrive, label: "Дедики" },
    { id: "domains" as Tab, icon: Globe, label: "Домены" },
    { id: "storagebox" as Tab, icon: HardDrive, label: "StorageBox" },
    { id: "status" as Tab, icon: Activity, label: "Статус" },
    { id: "smtp" as Tab, icon: Mail, label: "SMTP" },
    { id: "logs" as Tab, icon: FileText, label: "Логи" },
    { id: "settings" as Tab, icon: Settings, label: "Настройки" },
  ]

  const checkPterodactyl = async () => {
    setPterodactylConnected(null)
    setPterodactylError(null)
    try {
      const res = await fetch('/api/admin/pterodactyl/test')
      const data = await res.json()
      setPterodactylConnected(data.connected)
      if (!data.connected && data.error) {
        setPterodactylError(data.error)
        notify.error('Pterodactyl: ' + data.error)
      } else if (data.connected) {
        notify.success('Pterodactyl подключён!')
      }
    } catch (e) { 
      setPterodactylConnected(false)
      setPterodactylError(String(e))
      notify.error('Ошибка проверки: ' + e)
    }
  }

  const syncPterodactyl = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/pterodactyl/sync', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        notify.success(`Синхронизировано: ${data.synced.eggs.total} ядер, ${data.synced.nodes.total} нод`)
        loadEggs(); loadNodes()
      } else notify.error('Ошибка: ' + (data.error || 'Unknown'))
    } catch (e) { notify.error('Ошибка синхронизации: ' + e) }
    setSyncing(false)
  }

  const loadUsers = async () => { try { const r = await fetch('/api/admin/users'); const d = await r.json(); if (Array.isArray(d)) { setUsers(d); return true } } catch {} return false }
  const loadPlans = async () => { try { const r = await fetch('/api/admin/plans'); const d = await r.json(); if (Array.isArray(d)) { setPlans(d.sort((a: Plan, b: Plan) => a.sortOrder - b.sortOrder)); return true } } catch {} return false }
  const loadServers = async () => { try { const r = await fetch('/api/admin/servers'); const d = await r.json(); if (Array.isArray(d)) { setServers(d); return true } } catch {} return false }
  const loadEggs = async () => { try { const r = await fetch('/api/admin/eggs'); const d = await r.json(); if (Array.isArray(d)) { setEggs(d); return true } } catch {} return false }
  const loadNodes = async () => { try { const r = await fetch('/api/admin/nodes'); const d = await r.json(); if (Array.isArray(d)) { setNodes(d); return true } } catch {} return false }
  const loadPromos = async () => { try { const r = await fetch('/api/admin/promos'); if (r.ok) { const d = await r.json(); setPromos(Array.isArray(d) ? d : []); return true } } catch {} return false }
  const loadGlobalDiscount = async () => { try { const r = await fetch('/api/admin/settings'); if (r.ok) { const d = await r.json(); const disc = d.find((s: { key: string }) => s.key === 'globalDiscount'); setGlobalDiscount(disc ? parseFloat(disc.value) : 0); const snow = d.find((s: { key: string }) => s.key === 'snowEnabled'); setSnowEnabled(snow?.value === 'true'); const maintenance = d.find((s: { key: string }) => s.key === 'maintenanceMode'); setMaintenanceMode(maintenance?.value === 'true'); const serverDisabled = d.find((s: { key: string }) => s.key === 'serverCreationDisabled'); setServerCreationDisabled(serverDisabled?.value === 'true'); const coreLimit = d.find((s: { key: string }) => s.key === 'vdsCoreLimit'); setVdsCoreLimit(coreLimit ? parseInt(coreLimit.value) : 100); return true } } catch {} return false }
  const loadServiceStatuses = async () => { try { const r = await fetch('/api/admin/status'); if (r.ok) { const d = await r.json(); setServiceStatuses(Array.isArray(d) ? d : []); return true } } catch {} return false }
  const initServiceStatuses = async () => { try { await fetch('/api/admin/status/init', { method: 'POST' }); await loadServiceStatuses() } catch {} }
  const checkAllStatuses = async () => { setCheckingStatuses(true); try { const r = await fetch('/api/admin/status/check', { method: 'POST' }); if (r.ok) { await loadServiceStatuses(); notify.success('Статусы проверены') } } catch { notify.error('Ошибка проверки') } setCheckingStatuses(false) }
  const syncStatuses = async () => { setSyncingStatuses(true); try { const r = await fetch('/api/admin/status/sync', { method: 'POST' }); if (r.ok) { const d = await r.json(); await loadServiceStatuses(); notify.success(`Синхронизировано: ${d.count} статусов`) } else { notify.error('Ошибка синхронизации') } } catch { notify.error('Ошибка синхронизации') } setSyncingStatuses(false) }

  // VMManager functions
  const checkVmManager = async () => {
    setVmConnected(null)
    setVmError(null)
    try {
      const res = await fetch('/api/admin/vmmanager/test')
      const data = await res.json()
      setVmConnected(data.connected)
      if (!data.connected && data.error) {
        setVmError(data.error)
        notify.error('VMManager: ' + data.error)
      } else if (data.connected) {
        notify.success('VMManager подключён!')
      }
    } catch (e) {
      setVmConnected(false)
      setVmError(String(e))
      notify.error('Ошибка проверки VMManager: ' + e)
    }
  }

  const syncVmManager = async () => {
    setVmSyncing(true)
    try {
      const res = await fetch('/api/admin/vmmanager/sync', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        console.log('[Admin] VMManager sync data:', data.data)
        
        const hosts = Array.isArray(data.data?.hosts) ? data.data.hosts : []
        const nodes = Array.isArray(data.data?.nodes) ? data.data.nodes : []
        const osImages = Array.isArray(data.data?.osImages) ? data.data.osImages : []
        
        console.log('[Admin] Sync setting hosts:', hosts.length)
        console.log('[Admin] Sync setting nodes:', nodes.length)
        console.log('[Admin] Sync setting osImages:', osImages.length)
        
        setVmHosts(hosts)
        setVmNodes(nodes)
        setVmOsImages(osImages)
        notify.success(`Синхронизировано: ${data.synced?.hosts || 0} серверов, ${data.synced?.nodes || 0} нод, ${data.synced?.osImages || 0} ОС`)
      } else {
        notify.error('Ошибка: ' + (data.error || 'Unknown'))
      }
    } catch (e) {
      notify.error('Ошибка синхронизации: ' + e)
    }
    setVmSyncing(false)
  }

  const loadVmHosts = async () => {
    try {
      const r = await fetch('/api/admin/vmmanager')
      if (r.ok) {
        const d = await r.json()
        const hosts = Array.isArray(d.hosts) ? d.hosts : []
        
        // Логирование для отладки дисков
        if (hosts.length > 0) {
          console.log('[Admin] VDS Hosts disk data:', hosts.map((h: any) => ({
            id: h.id,
            name: h.name,
            disk: h.disk,
            diskInGB: h.disk ? Math.round(h.disk / 1024) : 0
          })))
        }
        
        setVmHosts(hosts)
        setVmExpiredCount(typeof d.expiredCount === 'number' ? d.expiredCount : 0)
      } else {
        // При ошибке не сбрасываем данные, но логируем
        console.error('[Admin] Failed to load VM hosts:', r.status)
      }
    } catch (e) {
      console.error('[Admin] Error loading VM hosts:', e)
    }
  }

  const loadVmRentals = async () => {
    try {
      const r = await fetch('/api/admin/vmmanager/rentals')
      if (r.ok) {
        const d = await r.json()
        setVmRentals(Array.isArray(d) ? d : [])
      }
    } catch (e) {
      console.error('[Admin] Error loading VM rentals:', e)
    }
  }

  const loadVmNodes = async () => {
    try {
      console.log('[Admin] Loading VM nodes...')
      const r = await fetch('/api/admin/vmmanager/nodes')
      console.log('[Admin] VM nodes response status:', r.status)
      
      if (r.ok) {
        const d = await r.json()
        console.log('[Admin] VM nodes response data:', d)
        console.log('[Admin] VM nodes is array:', Array.isArray(d))
        console.log('[Admin] VM nodes length:', Array.isArray(d) ? d.length : 'not array')
        
        const nodes = Array.isArray(d) ? d : []
        setVmNodes(nodes)
        console.log('[Admin] Set VM nodes:', nodes.length, 'nodes')
        
        // Additional debug: log each node
        nodes.forEach((node: any, index: number) => {
          console.log(`[Admin] Node ${index + 1}:`, {
            id: node.id,
            name: node.name,
            cluster: node.cluster,
            is_active: node.is_active
          })
        })
        
        return true
      } else {
        const errorData = await r.text()
        console.error('[Admin] VM nodes API error:', r.status, errorData)
        setVmNodes([])
        return false
      }
    } catch (e) {
      console.error('[Admin] Error loading VM nodes:', e)
      setVmNodes([])
      return false
    }
  }

  const loadVmOsImages = async () => {
    try {
      const r = await fetch('/api/admin/vmmanager/os-images')
      if (r.ok) {
        const d = await r.json()
        setVmOsImages(Array.isArray(d) ? d : [])
      }
    } catch (e) {
      console.error('[Admin] Error loading VM OS images:', e)
    }
  }

  const loadVmClusters = async () => {
    try {
      const r = await fetch('/api/admin/vmmanager/clusters')
      if (r.ok) {
        const d = await r.json()
        setVmClusters(Array.isArray(d) ? d : [])
      }
    } catch (e) {
      console.error('[Admin] Error loading VM clusters:', e)
    }
  }

  const loadVmPresets = async () => {
    try {
      const r = await fetch('/api/admin/vmmanager/presets')
      if (r.ok) {
        const d = await r.json()
        setVmPresets(Array.isArray(d) ? d : [])
      }
    } catch (e) {
      console.error('[Admin] Error loading VM presets:', e)
    }
  }

  const loadVmIpPools = async () => {
    try {
      const r = await fetch('/api/admin/vmmanager/ip-pools')
      if (r.ok) {
        const d = await r.json()
        setVmIpPools(Array.isArray(d) ? d : [])
      } else {
        // IP pools могут быть недоступны из-за прав - это нормально
        console.log('[Admin] IP pools not available (may require admin rights in VMManager)')
        setVmIpPools([])
      }
    } catch (e) {
      console.log('[Admin] IP pools not available:', e)
      setVmIpPools([])
    }
  }

  const loadDiscordWebhook = async () => {
    try {
      const r = await fetch('/api/admin/settings')
      if (r.ok) {
        const d = await r.json()
        const webhook = d.find((s: { key: string }) => s.key === 'discordWebhook')
        setDiscordWebhook(webhook?.value || '')
      }
    } catch {}
  }

  const saveDiscordWebhook = async (url: string) => {
    try {
      const r = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'discordWebhook', value: url })
      })
      if (r.ok) {
        notify.success('Discord Webhook saved')
      }
    } catch {}
  }

  const vmServerAction = async (hostId: number, action: string, reason?: string) => {
    if (action === 'delete' && !confirm('Удалить VDS сервер? Это действие необратимо.')) return
    if (action === 'ban' && !reason) {
      reason = prompt('Введите причину блокировки:') || undefined
      if (!reason) return
    }
    
    setVmActionLoading(hostId)
    try {
      const r = await fetch('/api/admin/vmmanager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, hostId, reason })
      })
      const d = await r.json()
      if (r.ok) {
        notify.success(d.message || 'Действие выполнено')
        // Небольшая задержка для синхронизации данных
        setTimeout(() => {
          loadVmHosts()
          loadVmRentals()
        }, 500)
      } else {
        notify.error(d.error || 'Ошибка')
      }
    } catch (e) {
      notify.error('Ошибка: ' + e)
    }
    setVmActionLoading(null)
  }

  const processExpiredRentals = async () => {
    if (!confirm('Приостановить все серверы с истёкшей арендой?')) return
    try {
      const r = await fetch('/api/admin/vmmanager/expired', { method: 'POST' })
      const d = await r.json()
      if (r.ok) {
        notify.success(d.message)
        loadVmHosts()
        loadVmRentals()
      } else {
        notify.error(d.error || 'Ошибка')
      }
    } catch (e) {
      notify.error('Ошибка: ' + e)
    }
  }

  // SMTP functions
  const loadSmtpSettings = async () => {
    try {
      const r = await fetch('/api/admin/smtp')
      if (r.ok) {
        const d = await r.json()
        setSmtpSettings({
          host: d.host || '',
          port: d.port || '587',
          user: d.user || '',
          password: d.password || '',
          from: d.from || '',
          secure: d.secure === 'true',
        })
      }
    } catch {}
  }

  const saveSmtpSettings = async () => {
    setSmtpSaving(true)
    try {
      const r = await fetch('/api/admin/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpSettings),
      })
      if (r.ok) {
        notify.success('SMTP настройки сохранены')
      } else {
        notify.error('Ошибка сохранения')
      }
    } catch {
      notify.error('Ошибка сохранения')
    }
    setSmtpSaving(false)
  }

  const testSmtp = async () => {
    if (!smtpTestEmail) {
      notify.error('Введите email для теста')
      return
    }
    setSmtpTesting(true)
    try {
      const r = await fetch('/api/admin/smtp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail: smtpTestEmail }),
      })
      const d = await r.json()
      if (r.ok) {
        notify.success('Тестовое письмо отправлено!')
      } else {
        notify.error(d.error || 'Ошибка отправки')
      }
    } catch {
      notify.error('Ошибка отправки')
    }
    setSmtpTesting(false)
  }

  const refreshAllData = async () => {
    try {
      const results = await Promise.all([loadUsers(), loadServers(), loadPlans(), loadEggs(), loadNodes()])
      const successCount = results.filter(r => r).length
      if (successCount === results.length) {
        notify.success(`Все данные обновлены (${successCount}/${results.length})`)
      } else {
        notify.success(`Обновлено ${successCount}/${results.length} источников`)
      }
    } catch {
      notify.error('Ошибка при обновлении данных')
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) {
          setIsAuthorized(false)
          router.push('/client')
          return
        }
        const data = await res.json()
        if (data.user?.role !== 'ADMIN') {
          setIsAuthorized(false)
          router.push('/client')
          return
        }
        setIsAuthorized(true)
        checkPterodactyl(); loadUsers(); loadPlans(); loadServers(); loadEggs(); loadNodes(); loadPromos(); loadGlobalDiscount(); initServiceStatuses(); loadSmtpSettings(); checkVmManager(); loadVmHosts(); loadVmRentals(); loadVmNodes(); loadVmOsImages(); loadVmClusters(); loadVmPresets(); loadVmIpPools(); loadVdsCurrentCores(); loadDiscordWebhook()
      } catch {
        setIsAuthorized(false)
        router.push('/client')
      }
    }
    checkAuth()
  }, [router])

  const deleteUser = async (userId: string) => {
    if (!confirm('Удалить пользователя? Это действие необратимо.')) return
    try {
      const r = await fetch('/api/admin/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) })
      if (r.ok) { loadUsers(); notify.success('Пользователь удалён') }
      else { const d = await r.json(); notify.error(d.error || 'Ошибка при удалении') }
    } catch { notify.error('Ошибка при удалении') }
  }

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) password += chars.charAt(Math.floor(Math.random() * chars.length))
    return password
  }

  const handleEditUserOpen = (user: User) => {
    setEditingUser(user)
    setEditingUserForm({ name: user.name || '', email: user.email, newPassword: '', balance: user.balance, role: user.role })
  }

  const handleSaveUser = async () => {
    if (!editingUser) return
    try {
      const updateData: any = {}
      if (editingUserForm.name !== editingUser.name) updateData.name = editingUserForm.name
      if (editingUserForm.email !== editingUser.email) updateData.email = editingUserForm.email
      if (editingUserForm.newPassword) updateData.password = editingUserForm.newPassword
      if (editingUserForm.balance !== editingUser.balance) updateData.balance = editingUserForm.balance
      if (editingUserForm.role !== editingUser.role) updateData.role = editingUserForm.role
      
      if (Object.keys(updateData).length === 0) {
        notify.error('Нет изменений')
        return
      }
      
      const r = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: editingUser.id, ...updateData }) })
      if (r.ok) { 
        loadUsers()
        setEditingUser(null)
        setEditingUserForm({ name: '', email: '', newPassword: '', balance: 0, role: 'USER' })
        notify.success('Пользователь обновлён')
      } else {
        const d = await r.json()
        notify.error(d.error || 'Ошибка при обновлении')
      }
    } catch { notify.error('Ошибка при обновлении') }
  }

  const verifyUserEmail = async (userId: string) => {
    if (!confirm('Верифицировать email пользователя?')) return
    try {
      const r = await fetch('/api/admin/users', { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ userId, emailVerified: true }) 
      })
      if (r.ok) { 
        loadUsers()
        notify.success('Email верифицирован')
      } else {
        const d = await r.json()
        notify.error(d.error || 'Ошибка при верификации')
      }
    } catch { notify.error('Ошибка при верификации') }
  }

  const savePlan = async (plan: Partial<Plan> & { id?: string; allowedEggIds?: string[] }) => {
    try {
      const r = await fetch('/api/admin/plans', { method: plan.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(plan) })
      if (r.ok) { loadPlans(); setEditingPlan(null); setShowNewPlan(false); notify.success(plan.id ? 'План обновлён' : 'План создан') }
    } catch {}
  }


  const deletePlan = async (id: string) => {
    if (!confirm('Удалить тариф?')) return
    try { const r = await fetch(`/api/admin/plans?id=${id}`, { method: 'DELETE' }); const d = await r.json(); if (r.ok) { loadPlans(); notify.success('План удалён') } else notify.error(d.error) } catch {}
  }

  const serverAction = async (serverId: string, action: string, force: boolean = false) => {
    if (action === 'delete' && !confirm('Удалить сервер?')) return
    if (action === 'force_delete' && !confirm('Принудительно удалить сервер из БД? Сервер в Pterodactyl останется (если существует).')) return
    try {
      const r = await fetch('/api/admin/servers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serverId, action, force }) })
      if (r.ok) { loadServers(); notify.success(action === 'suspend' ? 'Сервер приостановлен' : action === 'unsuspend' ? 'Сервер возобновлён' : 'Сервер удалён') }
      else { const d = await r.json(); notify.error(d.error) }
    } catch {}
  }

  const deleteNode = async (id: string, force: boolean = false) => {
    const node = nodes.find(n => n.id === id)
    if (!node) return
    
    if (node._count.servers > 0 && !force) {
      if (!confirm(`На узле ${node._count.servers} серверов. Удалить узел и пометить все сервера как удалённые?`)) return
      force = true
    } else if (!confirm(`Удалить узел "${node.name}"?`)) return
    
    try {
      const r = await fetch(`/api/admin/nodes?id=${id}&force=${force}`, { method: 'DELETE' })
      const d = await r.json()
      if (r.ok) { 
        loadNodes()
        loadServers()
        notify.success(d.message || 'Узел удалён') 
      } else { 
        notify.error(d.error || 'Ошибка при удалении') 
      }
    } catch { notify.error('Ошибка при удалении узла') }
  }

  const updateNode = async (id: string, data: any) => {
    try { const r = await fetch('/api/admin/nodes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...data }) }); if (r.ok) { loadNodes(); setEditingNode(null); notify.success('Нода обновлена') } } catch {}
  }

  const toggleEgg = async (id: string, isActive: boolean) => {
    try { await fetch('/api/admin/eggs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, isActive }) }); loadEggs(); notify.success(isActive ? 'Ядро активировано' : 'Ядро деактивировано') } catch {}
  }

  const savePromo = async (promo: Partial<PromoCode>) => {
    try { const r = await fetch('/api/admin/promos', { method: promo.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(promo) }); if (r.ok) { loadPromos(); setShowNewPromo(false); setEditingPromo(null); notify.success(promo.id ? 'Промокод обновлён' : 'Промокод создан') } else { const d = await r.json(); notify.error(d.error || 'Ошибка') } } catch {}
  }

  const deletePromo = async (id: string) => {
    if (!confirm('Удалить промокод?')) return
    try { const r = await fetch(`/api/admin/promos?id=${id}`, { method: 'DELETE' }); if (r.ok) { loadPromos(); notify.success('Промокод удалён') } } catch {}
  }

  const saveGlobalDiscount = async (discount: number) => {
    try { const r = await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'globalDiscount', value: discount.toString() }) }); if (r.ok) { setGlobalDiscount(discount); notify.success('Скидка сохранена') } } catch {}
  }

  const saveSnowEnabled = async (enabled: boolean) => {
    try { const r = await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'snowEnabled', value: enabled.toString() }) }); if (r.ok) { setSnowEnabled(enabled); notify.success(enabled ? 'Снег включён' : 'Снег выключен') } } catch {}
  }

  const saveMaintenanceMode = async (enabled: boolean) => {
    try { const r = await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'maintenanceMode', value: enabled.toString() }) }); if (r.ok) { setMaintenanceMode(enabled); notify.success(enabled ? 'Технические работы включены' : 'Технические работы выключены') } } catch {}
  }

  const saveServerCreationDisabled = async (disabled: boolean) => {
    try { const r = await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'serverCreationDisabled', value: disabled.toString() }) }); if (r.ok) { setServerCreationDisabled(disabled); notify.success(disabled ? 'Создание серверов отключено' : 'Создание серверов включено') } } catch {}
  }

  const saveVdsCoreLimit = async (limit: number) => {
    try { const r = await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'vdsCoreLimit', value: limit.toString() }) }); if (r.ok) { setVdsCoreLimit(limit); notify.success('Лимит ядер VDS сохранён') } } catch {}
  }

  const loadVdsCurrentCores = async () => {
    try { const r = await fetch('/api/admin/vmmanager/cores'); if (r.ok) { const d = await r.json(); setVdsCurrentCores(d.totalCores || 0) } } catch {}
  }

  const formatBytes = (mb: number) => {
    if (mb >= 1024) {
      const gb = mb / 1024
      return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`
    }
    return `${mb} MB`
  }
  const statusColors: Record<string, string> = { 
    PENDING: 'bg-amber-500/20 text-amber-500', 
    INSTALLING: 'bg-amber-500/20 text-amber-500', 
    ACTIVE: 'bg-emerald-500/20 text-emerald-500', 
    SUSPENDED: 'bg-amber-500/20 text-amber-500', 
    OFF: 'bg-red-500/20 text-red-500',
    RESTARTING: 'bg-blue-500/20 text-blue-500',
    DELETED: 'bg-gray-500/20 text-gray-500' 
  }
  const statusLabels: Record<string, string> = {
    PENDING: 'Ожидание',
    INSTALLING: 'Установка',
    ACTIVE: 'Онлайн',
    SUSPENDED: 'Отключен',
    OFF: 'Выключен',
    RESTARTING: 'Перезагружается',
    DELETED: 'Удален'
  }
  const activeServers = servers.filter(s => s.status !== 'DELETED').length
  const totalRevenue = servers.filter(s => s.status === 'ACTIVE').reduce((acc, s) => acc + s.plan.price, 0)

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Проверка доступа...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-4 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-1 rounded-2xl border border-border bg-background/80 px-2 py-2 shadow-lg backdrop-blur-md">
          <Link href="/" className="flex items-center gap-2 px-3 hover:scale-105 transition-transform duration-200">
            <Logo className="size-6 text-foreground" />
            <span className="font-heading font-bold text-foreground hidden sm:block">Avelon</span>
          </Link>
          
          <div className="h-6 w-px bg-border mx-1" />
          
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition-all duration-200 hover:scale-[1.02] ${
                activeTab === item.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <item.icon className="size-4" />
              <span className="hidden md:block">{item.label}</span>
            </button>
          ))}
          
          <div className="h-6 w-px bg-border mx-1" />
          
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-32 md:w-48 pl-9 pr-3 py-2 rounded-xl bg-accent/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-accent transition-all duration-200"
            />
          </div>
          
          <ThemeToggle />
          
          <Link href="/client" className="size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <LogOut className="size-4" />
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 pt-24 pb-12">

        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading text-2xl font-bold text-foreground">Обзор</h1>
                <p className="text-muted-foreground">Пользователи • Серверы • Тарифы • Ежемесячно</p>
              </div>
              <button 
                onClick={refreshAllData}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-foreground hover:bg-accent/80 transition-colors"
              >
                <RefreshCw className="size-4" />
                Обновить
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center justify-center">
                <div className="relative size-40 mb-3">
                  <svg className="size-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
                    <circle 
                      cx="60" 
                      cy="60" 
                      r="54" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="6" 
                      strokeDasharray={`${(users.length / 1000) * 339.29} 339.29`}
                      className="text-blue-500 transition-all duration-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Users className="size-5 text-blue-500 mb-1" />
                    <p className="text-2xl font-black text-foreground">{users.length}</p>
                    <p className="text-xs font-bold text-blue-500">{Math.min(Math.round((users.length / 1000) * 100), 100)}%</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-medium">пользователей</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center justify-center">
                <div className="relative size-40 mb-3">
                  <svg className="size-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
                    <circle 
                      cx="60" 
                      cy="60" 
                      r="54" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="6" 
                      strokeDasharray={`${(activeServers / 500) * 339.29} 339.29`}
                      className="text-emerald-500 transition-all duration-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Server className="size-5 text-emerald-500 mb-1" />
                    <p className="text-2xl font-black text-foreground">{activeServers}</p>
                    <p className="text-xs font-bold text-emerald-500">{Math.min(Math.round((activeServers / 500) * 100), 100)}%</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-medium">серверов</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center justify-center">
                <div className="relative size-40 mb-3">
                  <svg className="size-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
                    <circle 
                      cx="60" 
                      cy="60" 
                      r="54" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="6" 
                      strokeDasharray={`${(plans.filter(p => p.isActive).length / 50) * 339.29} 339.29`}
                      className="text-violet-500 transition-all duration-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <CreditCard className="size-5 text-violet-500 mb-1" />
                    <p className="text-2xl font-black text-foreground">{plans.filter(p => p.isActive).length}</p>
                    <p className="text-xs font-bold text-violet-500">{Math.min(Math.round((plans.filter(p => p.isActive).length / 50) * 100), 100)}%</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-medium">тарифов</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center justify-center">
                <div className="relative size-40 mb-3">
                  <svg className="size-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
                    <circle 
                      cx="60" 
                      cy="60" 
                      r="54" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="6" 
                      strokeDasharray={`${Math.min((totalRevenue / 100000) * 339.29, 339.29)} 339.29`}
                      className="text-amber-500 transition-all duration-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Wallet className="size-5 text-amber-500 mb-1" />
                    <p className="text-2xl font-black text-foreground">{(totalRevenue / 1000).toFixed(0)}K</p>
                    <p className="text-xs font-bold text-amber-500">{Math.min(Math.round((totalRevenue / 100000) * 100), 100)}%</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-medium">ежемесячно</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">Платящих клиентов</span>
                  <Users className="size-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">{users.filter(u => u._count.servers > 0).length}</p>
                <p className="text-xs text-muted-foreground mt-1">{Math.round((users.filter(u => u._count.servers > 0).length / users.length) * 100)}% от всех</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">Всего выручка</span>
                  <Wallet className="size-4 text-amber-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">{(totalRevenue * 12).toLocaleString()} ₽</p>
                <p className="text-xs text-muted-foreground mt-1">в год</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">Активных серверов</span>
                  <Server className="size-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">{servers.filter(s => s.status === 'ACTIVE').length}</p>
                <p className="text-xs text-muted-foreground mt-1">{Math.round((servers.filter(s => s.status === 'ACTIVE').length / servers.filter(s => s.status !== 'DELETED').length) * 100)}% активных</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">Средний тариф</span>
                  <CreditCard className="size-4 text-violet-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">{servers.filter(s => s.status === 'ACTIVE').length > 0 ? Math.round(totalRevenue / servers.filter(s => s.status === 'ACTIVE').length) : 0} ₽</p>
                <p className="text-xs text-muted-foreground mt-1">в месяц</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">Ядра</span>
                  <Zap className="size-4 text-yellow-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">{eggs.filter(e => e.isActive).length}</p>
                <p className="text-xs text-muted-foreground mt-1">активных / {eggs.length}</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">Ноды</span>
                  <Globe className="size-4 text-cyan-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">{nodes.filter(n => n.isActive).length}</p>
                <p className="text-xs text-muted-foreground mt-1">активных / {nodes.length}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Pterodactyl</span>
                  <Shield className="size-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  <div className={`size-2 rounded-full ${pterodactylConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-sm text-foreground">{pterodactylConnected ? 'Подключено' : 'Отключено'}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Ожидающих серверов</span>
                  <RefreshCw className="size-4 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold text-foreground">{servers.filter(s => s.status === 'PENDING' || s.status === 'INSTALLING').length}</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Приостановленных</span>
                  <AlertCircle className="size-4 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold text-foreground">{servers.filter(s => s.status === 'SUSPENDED').length}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-medium text-foreground">Последние серверы</h3>
                <button onClick={() => setActiveTab("servers")} className="text-sm text-primary hover:underline">Все →</button>
              </div>
              <div className="divide-y divide-border">
                {servers.slice(0, 5).map((server) => (
                  <div key={server.id} className="px-5 py-3 flex items-center justify-between hover:bg-accent/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-accent flex items-center justify-center">
                        <Server className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{server.name}</p>
                        <p className="text-xs text-muted-foreground">{server.user.email}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full ${statusColors[server.status]}`}>{server.status}</span>
                  </div>
                ))}
                {servers.length === 0 && <div className="px-5 py-8 text-center text-muted-foreground">Нет серверов</div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading text-2xl font-bold text-foreground">{users.filter(u => !searchQuery || u.email.toLowerCase().includes(searchQuery.toLowerCase()) || u.name?.toLowerCase().includes(searchQuery.toLowerCase())).length} пользователей</h1>
                <p className="text-sm text-muted-foreground">Всего: {users.length}</p>
              </div>
              <button onClick={() => { loadUsers(); notify.success('Список пользователей обновлён') }} className="size-9 rounded-xl bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <RefreshCw className="size-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск по email или имени..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-accent/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-accent focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            
            <div className="space-y-2">
              {users.filter(u => !searchQuery || u.email.toLowerCase().includes(searchQuery.toLowerCase()) || u.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((user) => (
                <div key={user.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-primary/30 transition-all group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="size-9 rounded-lg flex items-center justify-center text-muted-foreground flex-shrink-0 border border-border">
                      {user.role === 'ADMIN' ? <Shield className="size-4 text-muted-foreground" /> : <Users className="size-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{user.name || user.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mx-4 text-xs text-muted-foreground flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <Wallet className="size-3.5 text-muted-foreground" />
                      <span className="font-medium text-foreground">{user.balance.toFixed(2)} ₽</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Server className="size-3.5 text-muted-foreground" />
                      <span className="font-medium text-foreground">{user._count.servers}</span>
                    </div>
                    {user.pterodactylId && (
                      <div className="flex items-center gap-1">
                        <Database className="size-3.5 text-muted-foreground" />
                        <span className="font-medium text-foreground">{user.pterodactylId}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1" title={user.emailVerified ? "Email подтвержден" : "Email не подтвержден"}>
                      {user.emailVerified ? (
                        <CheckCircle className="size-3.5 text-emerald-500" />
                      ) : (
                        <XCircle className="size-3.5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${user.role === 'ADMIN' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>{user.role}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleEditUserOpen(user)} className="size-8 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-all" title="Редактировать">
                      <Edit className="size-4" />
                    </button>
                    {!user.emailVerified && (
                      <button onClick={() => verifyUserEmail(user.id)} className="size-8 rounded-lg hover:bg-emerald-500/20 flex items-center justify-center text-muted-foreground hover:text-emerald-500 transition-all" title="Верифицировать email">
                        <Mail className="size-4" />
                      </button>
                    )}
                    <button onClick={() => deleteUser(user.id)} className="size-8 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-all" title="Удалить">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {users.filter(u => !searchQuery || u.email.toLowerCase().includes(searchQuery.toLowerCase()) || u.name?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <div className="rounded-2xl border border-border bg-card px-5 py-12 text-center text-muted-foreground">
                <Users className="size-12 mx-auto mb-3 opacity-50" />
                <p>Пользователи не найдены</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "servers" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="font-heading text-2xl font-bold text-foreground">{activeServers} серверов</h1>
              <button onClick={loadServers} className="size-9 rounded-xl bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <RefreshCw className="size-4" />
              </button>
            </div>
            
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-accent/30">
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Сервер</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Владелец</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Тариф</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Нода</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Статус</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {servers.filter(s => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.user.email.toLowerCase().includes(searchQuery.toLowerCase())).map((server) => (
                    <tr key={server.id} className="hover:bg-accent/20 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-accent flex items-center justify-center">
                            <Server className="size-4 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium text-foreground">{server.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">{server.user.email}</td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">{server.plan.name}</td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">{server.node?.name || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full ${statusColors[server.status]}`}>{statusLabels[server.status] || server.status}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {(server.status === 'ACTIVE' || server.status === 'OFF') && (
                            <button onClick={() => serverAction(server.id, 'suspend')} className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors">Suspend</button>
                          )}
                          {server.status === 'SUSPENDED' && (
                            <button onClick={() => serverAction(server.id, 'unsuspend')} className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors">Unsuspend</button>
                          )}
                          {server.status !== 'DELETED' && (
                            <>
                              <button onClick={() => serverAction(server.id, 'delete')} className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">Delete</button>
                              <button onClick={() => serverAction(server.id, 'force_delete')} className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors" title="Принудительное удаление (только из БД)">Force</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}


        {activeTab === "plans" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="font-heading text-2xl font-bold text-foreground">{plans.length} тарифов</h1>
              <button onClick={() => { 
                setPlanCategory('MINECRAFT')
                setPlanFormPreset('')
                setPlanFormCluster('')
                setPlanFormNode('')
                setPlanFormNodeStrategy('auto')
                setPlanFormIpPool('')
                setPlanFormStatus('true')
                setPlanFormVdsType('STANDARD')
                setPlanFormVdsLocation('DE')
                setPlanFormCpuModel('')
                setPlanFormCity('')
                setPlanFormCountry('')
                setShowNewPlan(true)
              }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors">
                <Plus className="size-4" />
                Новый тариф
              </button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                // Для VDS тарифов получаем характеристики из пресета
                const isVds = plan.category === 'VDS'
                const preset = isVds && plan.vmPresetId ? vmPresets.find((p: any) => Number(p.id) === Number(plan.vmPresetId)) : null
                const vdsCpu = preset?.cpu_number || 0
                const vdsRamMb = preset?.ram_mib || 0
                const vdsDiskMb = preset?.disks?.reduce((sum: number, disk: any) => sum + (disk.size_mib || 0), 0) || 0
                const vdsDiskGb = Math.round(vdsDiskMb / 1024)
                
                return (
                  <div key={plan.id} className={`group rounded-2xl border p-5 transition-all hover:shadow-lg ${plan.isActive ? 'border-border bg-card' : 'border-red-500/30 bg-red-500/5'}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-foreground">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground">{plan.category}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { 
                          setPlanCategory(plan.category)
                          setPlanFormPreset(plan.vmPresetId?.toString() || '')
                          setPlanFormCluster(plan.vmClusterId?.toString() || '')
                          setPlanFormNode(plan.vmNodeId?.toString() || '')
                          setPlanFormNodeStrategy(plan.vmNodeStrategy || 'auto')
                          setPlanFormIpPool(plan.vmIpPoolId?.toString() || '')
                          setPlanFormStatus(plan.isActive !== false ? 'true' : 'false')
                          
                          // Парсим vdsCustomSpecs если есть
                          if (plan.vdsCustomSpecs) {
                            try {
                              const specs = JSON.parse(plan.vdsCustomSpecs)
                              setPlanFormVdsType(specs.vdsType || 'STANDARD')
                              setPlanFormVdsLocation(specs.vdsLocation || 'DE')
                              setPlanFormCpuModel(specs.cpuModel || '')
                              setPlanFormCity(specs.city || '')
                              setPlanFormCountry(specs.country || '')
                            } catch {
                              setPlanFormVdsType('STANDARD')
                              setPlanFormVdsLocation('DE')
                              setPlanFormCpuModel('')
                              setPlanFormCity('')
                              setPlanFormCountry('')
                            }
                          } else {
                            setPlanFormVdsType('STANDARD')
                            setPlanFormVdsLocation('DE')
                            setPlanFormCpuModel('')
                            setPlanFormCity('')
                            setPlanFormCountry('')
                          }
                          
                          setEditingPlan(plan)
                        }} className="size-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                          <Edit className="size-3.5" />
                        </button>
                        <button onClick={() => deletePlan(plan.id)} className="size-7 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-red-500 transition-colors">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4 text-sm">
                      {isVds ? (
                        // VDS тариф - показываем характеристики из пресета или кастомные
                        <>
                          {preset ? (
                            <>
                              <div className="flex items-center gap-2 text-muted-foreground"><Cpu className="size-3.5" /><span>{vdsCpu} vCPU</span></div>
                              <div className="flex items-center gap-2 text-muted-foreground"><MemoryStick className="size-3.5" /><span>{vdsRamMb >= 1024 ? `${Number.isInteger(vdsRamMb / 1024) ? vdsRamMb / 1024 : (vdsRamMb / 1024).toFixed(1)} GB` : `${vdsRamMb} MB`} RAM</span></div>
                              <div className="flex items-center gap-2 text-muted-foreground"><HardDrive className="size-3.5" /><span>{vdsDiskGb} GB SSD</span></div>
                              <div className="flex items-center gap-2">
                                <Cloud className="size-3.5 text-blue-500" />
                                <span className="text-blue-500 text-xs">Preset #{plan.vmPresetId}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 text-amber-500"><Cloud className="size-3.5" /><span>VDS тариф</span></div>
                              <div className="flex items-center gap-2 text-red-500"><Unlink className="size-3.5" /><span>Пресет не найден</span></div>
                            </>
                          )}
                          {/* Дополнительная информация из vdsCustomSpecs */}
                          {plan.vdsCustomSpecs && (() => {
                            try {
                              const specs = JSON.parse(plan.vdsCustomSpecs)
                              return (
                                <>
                                  {specs.vdsType && (
                                    <div className="flex items-center gap-2">
                                      {specs.vdsType === 'PROMO' ? (
                                        <><Zap className="size-3.5 text-amber-500" /><span className="text-amber-500 text-xs font-medium">VDS PROMO</span></>
                                      ) : (
                                        <><Cloud className="size-3.5 text-blue-500" /><span className="text-blue-500 text-xs font-medium">VDS</span></>
                                      )}
                                    </div>
                                  )}
                                  {specs.vdsLocation && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Globe className="size-3.5" />
                                      <span className="text-xs">{specs.vdsLocation === 'DE' ? 'Germany' : 'Russia'}</span>
                                    </div>
                                  )}
                                  {specs.cpuModel && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Cpu className="size-3.5" />
                                      <span className="text-xs">{specs.cpuModel}</span>
                                    </div>
                                  )}
                                  {(specs.city || specs.country) && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Globe className="size-3.5" />
                                      <span className="text-xs">{[specs.city, specs.country].filter(Boolean).join(', ')}</span>
                                    </div>
                                  )}
                                </>
                              )
                            } catch {
                              return null
                            }
                          })()}
                        </>
                      ) : (
                        // Minecraft/Coding тариф - показываем стандартные характеристики
                        <>
                          <div className="flex items-center gap-2 text-muted-foreground"><MemoryStick className="size-3.5" /><span>{formatBytes(plan.ram)}</span></div>
                          <div className="flex items-center gap-2 text-muted-foreground"><Cpu className="size-3.5" /><span>{plan.cpu}% CPU</span></div>
                          <div className="flex items-center gap-2 text-muted-foreground"><HardDrive className="size-3.5" /><span>{formatBytes(plan.disk)}</span></div>
                          <div className="flex items-center gap-2">
                            {plan.egg ? (<><Link2 className="size-3.5 text-emerald-500" /><span className="text-emerald-500">{plan.egg.name}</span></>) : (<><Unlink className="size-3.5 text-red-500" /><span className="text-red-500">Нет ядра</span></>)}
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="pt-4 border-t border-border flex items-center justify-between">
                      <span className="text-xl font-bold text-foreground">{plan.price} ₽</span>
                      <span className="text-xs text-muted-foreground">{plan._count.servers} серверов</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === "pterodactyl" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="font-heading text-2xl font-bold text-foreground">Pterodactyl Panel</h1>
              <div className="flex gap-2">
                <button onClick={checkPterodactyl} className="px-4 py-2 rounded-xl bg-accent text-foreground text-sm hover:bg-accent/80 transition-colors">Проверить</button>
                <button onClick={syncPterodactyl} disabled={syncing || !pterodactylConnected} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 disabled:opacity-50 transition-colors">
                  <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Синхронизация...' : 'Синхронизировать'}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              {pterodactylConnected === null ? (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-accent/50 w-fit">
                  <RefreshCw className="size-5 text-muted-foreground animate-spin" />
                  <span className="text-muted-foreground">Проверка подключения...</span>
                </div>
              ) : pterodactylConnected ? (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-emerald-500/10 w-fit">
                  <CheckCircle className="size-5 text-emerald-500" />
                  <span className="text-emerald-500">Подключено к Pterodactyl Panel</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-500/10 w-fit">
                    <XCircle className="size-5 text-red-500" />
                    <span className="text-red-500">Нет подключения</span>
                  </div>
                  {pterodactylError && (
                    <div className="px-4 py-2 rounded-xl bg-red-500/5 border border-red-500/20">
                      <p className="text-xs text-red-400 font-mono break-all">{pterodactylError}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-medium text-foreground">Ноды</h3>
                <span className="text-xs text-muted-foreground">{nodes.length} всего</span>
              </div>
              <div className="divide-y divide-border">
                {nodes.map((node) => (
                  <div key={node.id} className={`px-5 py-4 flex items-center justify-between hover:bg-accent/20 transition-colors ${!node.isActive ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-xl bg-accent flex items-center justify-center">
                        <Globe className="size-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{node.name}</p>
                        <p className="text-xs text-muted-foreground">{node.locationName || 'Unknown'} • {node.fqdn || 'No FQDN'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">{node.memory ? formatBytes(node.memory) : '—'}</p>
                        <p className="text-xs text-muted-foreground">+{node.priceModifier} ₽</p>
                      </div>
                      {node.countryCode && (
                        <span className="text-xs font-medium bg-blue-500/20 text-blue-400 px-2 py-1 rounded">{node.countryCode.toUpperCase()}</span>
                      )}
                      <span className="text-xs text-muted-foreground bg-accent px-2 py-1 rounded">{node._count.servers}</span>
                      <button onClick={() => { setEditingNode(node); setSelectedCountryCode(node.countryCode || ''); setSelectedNodeType(node.nodeType || 'MINECRAFT') }} className="size-8 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <Edit className="size-4" />
                      </button>
                      <button onClick={() => deleteNode(node.id)} className="size-8 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors" title="Удалить узел">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-medium text-foreground">Ядра / Eggs</h3>
                <span className="text-xs text-muted-foreground">{eggs.length} всего</span>
              </div>
              <div className="divide-y divide-border">
                {eggs.map((egg) => (
                  <div key={egg.id} className={`px-5 py-3 flex items-center justify-between hover:bg-accent/20 transition-colors ${!egg.isActive ? 'opacity-50' : ''}`}>
                    <div>
                      <p className="font-medium text-foreground">{egg.name}</p>
                      <p className="text-xs text-muted-foreground">{egg.nestName || `Nest #${egg.nestId}`} • ID: {egg.pterodactylId}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{egg._count.plans} тарифов • {egg._count.servers} серверов</span>
                      <button onClick={() => toggleEgg(egg.id, !egg.isActive)} className={`size-8 rounded-lg transition-colors ${egg.isActive ? 'hover:bg-red-500/20 text-red-500' : 'hover:bg-emerald-500/20 text-emerald-500'}`}>
                        {egg.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "vmmanager" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading text-2xl font-bold text-foreground">VmManager</h1>
                <p className="text-sm text-muted-foreground">Управление VDS серверами</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={checkVmManager}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-foreground hover:bg-accent/80 transition-colors"
                >
                  <RefreshCw className="size-4" />
                  Проверить
                </button>
                <button
                  onClick={syncVmManager}
                  disabled={vmSyncing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
                >
                  <Database className={`size-4 ${vmSyncing ? 'animate-spin' : ''}`} />
                  {vmSyncing ? 'Синхронизация...' : 'Синхронизировать'}
                </button>
              </div>
            </div>

            {/* Connection Status */}
            <div className={`rounded-2xl p-5 ${vmConnected === true ? 'bg-emerald-500/10 border border-emerald-500/20' : vmConnected === false ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`size-3 rounded-full ${vmConnected === true ? 'bg-emerald-500' : vmConnected === false ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`} />
                  <span className={`font-heading font-medium ${vmConnected === true ? 'text-emerald-500' : vmConnected === false ? 'text-red-500' : 'text-amber-500'}`}>
                    {vmConnected === true ? 'VMManager6 подключён' : vmConnected === false ? 'Ошибка подключения' : 'Проверка...'}
                  </span>
                </div>
                {vmError && <span className="text-sm text-red-400">{vmError}</span>}
              </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Server className="size-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{vmHosts.length}</p>
                    <p className="text-xs text-muted-foreground">VDS серверов</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Cpu className="size-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{vmNodes.length}</p>
                    <p className="text-xs text-muted-foreground">Нод</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <HardDrive className="size-5 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{vmOsImages.length}</p>
                    <p className="text-xs text-muted-foreground">ОС образов</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <AlertCircle className="size-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{vmExpiredCount}</p>
                    <p className="text-xs text-muted-foreground">Истёкших аренд</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Expired Rentals Warning */}
            {vmExpiredCount > 0 && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="size-5 text-amber-500" />
                    <span className="text-amber-500 font-medium">{vmExpiredCount} серверов с истёкшей арендой</span>
                  </div>
                  <button
                    onClick={processExpiredRentals}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
                  >
                    Приостановить все
                  </button>
                </div>
              </div>
            )}

            {/* VDS Servers Table */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-heading font-bold text-foreground">VDS Серверы</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-accent/30">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Имя</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Владелец</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Статус</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">CPU</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">RAM</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Диск</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Нода</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vmHosts.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                          Нет VDS серверов
                        </td>
                      </tr>
                    ) : (
                      vmHosts.map((host) => (
                        <tr key={host.id} className="border-b border-border hover:bg-accent/20 transition-colors">
                          <td className="px-4 py-3 text-sm text-foreground font-mono">{host.id}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{host.name}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{host.ownerEmail || <span className="text-muted-foreground/50">—</span>}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              host.status === 'running' || host.status === 'active' ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' :
                              host.status === 'stopped' || host.status === 'off' ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                              host.status === 'suspended' || host.status === 'paused' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                              host.status === 'installing' || host.status === 'creating' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' :
                              host.status === 'error' || host.status === 'failed' ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                              'bg-gray-500/20 text-gray-500 border border-gray-500/30'
                            }`}>
                              <span className={`size-1.5 rounded-full ${
                                host.status === 'running' || host.status === 'active' ? 'bg-emerald-500 animate-pulse' :
                                host.status === 'stopped' || host.status === 'off' ? 'bg-red-500' :
                                host.status === 'suspended' || host.status === 'paused' ? 'bg-amber-500' :
                                host.status === 'installing' || host.status === 'creating' ? 'bg-blue-500 animate-pulse' :
                                host.status === 'error' || host.status === 'failed' ? 'bg-red-500' :
                                'bg-gray-500'
                              }`} />
                              {host.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{host.cpu ? `${host.cpu} ядер` : '-'}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{host.ram ? `${Math.round(host.ram / 1024)} GB` : '-'}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {host.disk ? (
                              host.disk > 1024 
                                ? `${Math.round(host.disk / 1024)} GB` 
                                : `${host.disk} MB`
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{typeof host.node === 'object' ? host.node?.name || host.node?.id : host.node || '-'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {vmActionLoading === host.id ? (
                                <RefreshCw className="size-4 animate-spin text-muted-foreground" />
                              ) : (
                                <>
                                  <button
                                    onClick={() => vmServerAction(host.id, 'start')}
                                    className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-muted-foreground hover:text-emerald-500 transition-colors"
                                    title="Запустить"
                                  >
                                    <Zap className="size-4" />
                                  </button>
                                  <button
                                    onClick={() => vmServerAction(host.id, 'stop')}
                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors"
                                    title="Остановить"
                                  >
                                    <XCircle className="size-4" />
                                  </button>
                                  <button
                                    onClick={() => vmServerAction(host.id, 'restart')}
                                    className="p-1.5 rounded-lg hover:bg-blue-500/20 text-muted-foreground hover:text-blue-500 transition-colors"
                                    title="Перезапустить"
                                  >
                                    <RefreshCw className="size-4" />
                                  </button>
                                  <button
                                    onClick={() => vmServerAction(host.id, 'suspend')}
                                    className="p-1.5 rounded-lg hover:bg-amber-500/20 text-muted-foreground hover:text-amber-500 transition-colors"
                                    title="Приостановить"
                                  >
                                    <Shield className="size-4" />
                                  </button>
                                  <button
                                    onClick={() => vmServerAction(host.id, 'delete')}
                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors"
                                    title="Удалить"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rentals Table */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-heading font-bold text-foreground">Аренды VDS</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-accent/30">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Пользователь</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Тариф</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Цена</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Статус</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Истекает</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Автопродление</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vmRentals.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          Нет аренд
                        </td>
                      </tr>
                    ) : (
                      vmRentals.map((rental) => (
                        <tr key={rental.id} className="border-b border-border hover:bg-accent/20 transition-colors">
                          <td className="px-4 py-3 text-sm text-foreground font-mono">{rental.vmmanager6_host_id}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{rental.user_email || rental.user_id}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{rental.plan_name}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{rental.rental_price} ₽</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              rental.status === 'active' ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' :
                              rental.status === 'suspended' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                              rental.status === 'banned' ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                              rental.status === 'deleted' ? 'bg-gray-500/20 text-gray-500 border border-gray-500/30' :
                              'bg-gray-500/20 text-gray-500 border border-gray-500/30'
                            }`}>
                              <span className={`size-1.5 rounded-full ${
                                rental.status === 'active' ? 'bg-emerald-500 animate-pulse' :
                                rental.status === 'suspended' ? 'bg-amber-500' :
                                rental.status === 'banned' ? 'bg-red-500' :
                                'bg-gray-500'
                              }`} />
                              {rental.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {new Date(rental.expires_at).toLocaleDateString('ru-RU')}
                          </td>
                          <td className="px-4 py-3">
                            {rental.auto_renew ? (
                              <CheckCircle className="size-4 text-emerald-500" />
                            ) : (
                              <XCircle className="size-4 text-muted-foreground" />
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Nodes & OS Images */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Nodes */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-heading font-bold text-foreground">Ноды VMManager</h3>
                </div>
                <div className="p-4 space-y-2">
                  {vmNodes.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Нет нод</p>
                  ) : (
                    vmNodes.map((node) => (
                      <div key={node.id} className="flex items-center justify-between p-3 rounded-xl bg-accent/30">
                        <div className="flex items-center gap-3">
                          <div className={`size-2 rounded-full ${node.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <div>
                            <p className="text-sm font-medium text-foreground">{node.name}</p>
                            <p className="text-xs text-muted-foreground">{node.host}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">ID: {node.id}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* OS Images */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-heading font-bold text-foreground">ОС Образы</h3>
                  <button
                    onClick={async () => {
                      try {
                        const r = await fetch('/api/admin/vmmanager/os-images', { method: 'POST' })
                        const d = await r.json()
                        if (r.ok) {
                          notify.success(`Синхронизировано: ${d.created} новых, ${d.updated} обновлено`)
                          loadVmOsImages()
                        } else {
                          notify.error(d.error || 'Ошибка синхронизации')
                        }
                      } catch { notify.error('Ошибка синхронизации') }
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/80 text-foreground transition-colors"
                  >
                    Синхронизировать
                  </button>
                </div>
                <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                  {vmOsImages.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Нет образов</p>
                  ) : (
                    vmOsImages.map((os) => (
                      <div key={os.id} className={`flex items-center justify-between p-3 rounded-xl transition-colors ${os.isActive ? 'bg-accent/30' : 'bg-red-500/5 border border-red-500/20'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`size-2 rounded-full ${os.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <div>
                            <p className="text-sm font-medium text-foreground">{os.name}</p>
                            <p className="text-xs text-muted-foreground">VM ID: {os.vmManagerId}</p>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const r = await fetch('/api/admin/vmmanager/os-images', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: os.id, isActive: !os.isActive })
                              })
                              if (r.ok) {
                                loadVmOsImages()
                                notify.success(os.isActive ? 'ОС отключена' : 'ОС включена')
                              }
                            } catch { notify.error('Ошибка') }
                          }}
                          className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                            os.isActive 
                              ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                              : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                          }`}
                        >
                          {os.isActive ? 'Отключить' : 'Включить'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Clusters (Locations) */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-heading font-bold text-foreground">Кластеры (Локации)</h3>
                <button
                  onClick={async () => {
                    try {
                      const r = await fetch('/api/admin/vmmanager/clusters', { method: 'POST' })
                      const d = await r.json()
                      if (r.ok) {
                        notify.success(`Синхронизировано: ${d.created} новых, ${d.updated} обновлено`)
                        loadVmClusters()
                      } else {
                        notify.error(d.error || 'Ошибка синхронизации')
                      }
                    } catch { notify.error('Ошибка синхронизации') }
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/80 text-foreground transition-colors"
                >
                  Синхронизировать
                </button>
              </div>
              <div className="p-4 space-y-2">
                {vmClusters.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Нет кластеров. Нажмите "Синхронизировать"</p>
                ) : (
                  vmClusters.map((cluster) => (
                    <div key={cluster.id} className={`flex items-center justify-between p-3 rounded-xl transition-colors ${cluster.isActive ? 'bg-accent/30' : 'bg-red-500/5 border border-red-500/20'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`size-2 rounded-full ${cluster.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {cluster.countryCode && (
                          <img src={`/${cluster.countryCode}.png`} alt="" className="size-5 rounded-sm" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">{cluster.name}</p>
                          <p className="text-xs text-muted-foreground">VM ID: {cluster.vmManagerId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={cluster.countryCode || ''}
                          onChange={async (e) => {
                            try {
                              const r = await fetch('/api/admin/vmmanager/clusters', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: cluster.id, countryCode: e.target.value || null })
                              })
                              if (r.ok) {
                                loadVmClusters()
                                notify.success('Флаг обновлён')
                              }
                            } catch { notify.error('Ошибка') }
                          }}
                          className="text-xs px-2 py-1 rounded-lg bg-accent border border-border text-foreground"
                        >
                          <option value="">Флаг</option>
                          <option value="de">🇩🇪 DE</option>
                          <option value="fi">🇫🇮 FI</option>
                          <option value="nl">🇳🇱 NL</option>
                          <option value="ru">🇷🇺 RU</option>
                          <option value="fr">🇫🇷 FR</option>
                        </select>
                        <button
                          onClick={async () => {
                            try {
                              const r = await fetch('/api/admin/vmmanager/clusters', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: cluster.id, isActive: !cluster.isActive })
                              })
                              if (r.ok) {
                                loadVmClusters()
                                notify.success(cluster.isActive ? 'Кластер отключён' : 'Кластер включён')
                              }
                            } catch { notify.error('Ошибка') }
                          }}
                          className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                            cluster.isActive 
                              ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                              : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                          }`}
                        >
                          {cluster.isActive ? 'Отключить' : 'Включить'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Лимит ядер VDS */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading font-bold text-foreground">Лимит ядер VDS</h3>
                  <p className="text-sm text-muted-foreground mt-1">Используется: {vdsCurrentCores} / {vdsCoreLimit}</p>
                </div>
                <button 
                  onClick={() => { loadVdsCurrentCores(); notify.success('Данные обновлены') }} 
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <RefreshCw className="size-4 text-muted-foreground" />
                </button>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div 
                  className={`h-full transition-all rounded-full ${
                    vdsCurrentCores >= vdsCoreLimit ? 'bg-red-500' : 
                    vdsCurrentCores >= vdsCoreLimit * 0.8 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min((vdsCurrentCores / vdsCoreLimit) * 100, 100)}%` }}
                />
              </div>
              <div className="flex gap-3 mt-4">
                <input
                  type="number"
                  value={vdsCoreLimit}
                  onChange={(e) => setVdsCoreLimit(parseInt(e.target.value) || 0)}
                  min="0"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-accent border border-border text-sm text-foreground focus:outline-none"
                />
                <button
                  onClick={() => saveVdsCoreLimit(vdsCoreLimit)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
                >
                  <Save className="size-4" />
                  Сохранить
                </button>
              </div>
            </div>

            {/* Discord Webhook */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-heading font-bold text-foreground mb-2">Discord Webhook</h3>
              <p className="text-sm text-muted-foreground mb-4">Уведомления о созданных VDS</p>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={discordWebhook}
                  onChange={(e) => setDiscordWebhook(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-accent border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  onClick={() => saveDiscordWebhook(discordWebhook)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
                >
                  <Save className="size-4" />
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "status" && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h1 className="font-heading text-2xl font-bold text-foreground">Статус сервисов</h1>
                <p className="text-sm text-muted-foreground">Мониторинг доступности • Перетаскивайте для изменения порядка</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setShowNewStatus(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm hover:bg-accent transition-colors">
                  <Plus className="size-4" />
                  Добавить
                </button>
                <button 
                  onClick={async () => {
                    try {
                      const r = await fetch('/api/admin/status/fill-history', { method: 'POST' })
                      if (r.ok) {
                        const d = await r.json()
                        notify.success(`Создано ${d.created} записей за ${d.days} дней`)
                      } else {
                        notify.error('Ошибка заполнения')
                      }
                    } catch { notify.error('Ошибка') }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm hover:bg-accent transition-colors"
                >
                  <Database className="size-4" />
                  Заполнить историю
                </button>
                <button onClick={syncStatuses} disabled={syncingStatuses} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm hover:bg-accent disabled:opacity-50 transition-colors">
                  <Database className={`size-4 ${syncingStatuses ? 'animate-spin' : ''}`} />
                  {syncingStatuses ? 'Синхронизация...' : 'Синхронизация'}
                </button>
                <button onClick={checkAllStatuses} disabled={checkingStatuses} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 disabled:opacity-50 transition-colors">
                  <RefreshCw className={`size-4 ${checkingStatuses ? 'animate-spin' : ''}`} />
                  {checkingStatuses ? 'Проверка...' : 'Проверить все'}
                </button>
              </div>
            </div>

            {(() => {
              const allOnline = serviceStatuses.every(s => s.isOnline)
              return (
                <div className={`rounded-2xl p-5 ${allOnline ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`size-3 rounded-full ${allOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span className={`font-heading font-medium ${allOnline ? 'text-emerald-500' : 'text-red-500'}`}>
                        {allOnline ? 'Все системы работают' : 'Есть проблемы'}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Онлайн: <span className="font-medium text-foreground">{serviceStatuses.filter(s => s.isOnline).length}/{serviceStatuses.length}</span>
                    </span>
                  </div>
                </div>
              )
            })()}

            {(() => {
              const nodeStatuses = serviceStatuses.filter(s => s.type === 'NODE')
              const routerStatuses = serviceStatuses.filter(s => s.type === 'ROUTER')
              const webStatuses = serviceStatuses.filter(s => s.type === 'WEB' || s.type === 'GAME')
              const nodesOnline = nodeStatuses.filter(s => s.isOnline).length
              const routersOnline = routerStatuses.filter(s => s.isOnline).length
              const webOnline = webStatuses.filter(s => s.isOnline).length

              const handleDragStart = (e: React.DragEvent, status: ServiceStatus) => {
                e.dataTransfer.setData('statusId', status.id)
                e.dataTransfer.setData('statusType', status.type)
              }

              const handleDragOver = (e: React.DragEvent) => {
                e.preventDefault()
              }

              const handleDrop = async (e: React.DragEvent, targetStatus: ServiceStatus) => {
                e.preventDefault()
                const draggedId = e.dataTransfer.getData('statusId')
                const draggedType = e.dataTransfer.getData('statusType')
                
                if (draggedId === targetStatus.id) return
                if (draggedType !== targetStatus.type) {
                  notify.error('Можно перемещать только внутри одной категории')
                  return
                }

                const categoryStatuses = serviceStatuses.filter(s => s.type === targetStatus.type)
                const draggedIndex = categoryStatuses.findIndex(s => s.id === draggedId)
                const targetIndex = categoryStatuses.findIndex(s => s.id === targetStatus.id)

                if (draggedIndex === -1 || targetIndex === -1) return

                const newOrder = [...categoryStatuses]
                const [removed] = newOrder.splice(draggedIndex, 1)
                newOrder.splice(targetIndex, 0, removed)

                const updates = newOrder.map((s, i) => ({ id: s.id, sortOrder: i }))
                
                try {
                  const r = await fetch('/api/admin/status/reorder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ updates })
                  })
                  if (r.ok) {
                    loadServiceStatuses()
                    notify.success('Порядок обновлён')
                  }
                } catch {
                  notify.error('Ошибка обновления порядка')
                }
              }

              const StatusItem = ({ status }: { status: ServiceStatus }) => (
                <div 
                  key={status.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, status)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, status)}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-4 flex items-center justify-center text-muted-foreground/50">
                      <svg className="size-3" viewBox="0 0 10 16" fill="currentColor">
                        <circle cx="2" cy="2" r="1.5" />
                        <circle cx="8" cy="2" r="1.5" />
                        <circle cx="2" cy="8" r="1.5" />
                        <circle cx="8" cy="8" r="1.5" />
                        <circle cx="2" cy="14" r="1.5" />
                        <circle cx="8" cy="14" r="1.5" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {status.node?.name || status.name}
                    </span>
                    {status.responseTime && (
                      <span className="text-xs text-muted-foreground">{status.responseTime}ms</span>
                    )}
                    {status.isSystem && <span className="text-xs px-1.5 py-0.5 rounded bg-accent text-muted-foreground">sys</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingStatus(status)} className="size-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                      <Edit className="size-3.5" />
                    </button>
                    {!status.isSystem && (
                      <button
                        onClick={async () => {
                          if (!confirm('Удалить?')) return
                          try {
                            const r = await fetch(`/api/admin/status?id=${status.id}`, { method: 'DELETE' })
                            if (r.ok) { loadServiceStatuses(); notify.success('Удалено') }
                          } catch {}
                        }}
                        className="size-7 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-red-500 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                    {status.isOnline ? (
                      <CheckCircle className="size-4 text-emerald-500" />
                    ) : (
                      <XCircle className="size-4 text-red-500" />
                    )}
                  </div>
                </div>
              )
              
              return (
                <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
                  {/* Nodes section */}
                  <div>
                    <div className="flex items-center justify-between p-4 border-b border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-muted/50 flex items-center justify-center">
                          <Server className="size-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium text-foreground">Узлы</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          nodesOnline === nodeStatuses.length 
                            ? 'bg-emerald-500/10 text-emerald-500' 
                            : 'bg-red-500/10 text-red-500'
                        }`}>
                          {nodesOnline === nodeStatuses.length ? 'АКТИВНЫ' : 'ПРОБЛЕМЫ'} {nodesOnline}/{nodeStatuses.length}
                        </span>
                      </div>
                    </div>
                    
                    <div className="divide-y divide-border/50">
                      {nodeStatuses.map((status) => <StatusItem key={status.id} status={status} />)}
                      {nodeStatuses.length === 0 && (
                        <div className="px-4 py-6 text-sm text-muted-foreground text-center">Нет узлов</div>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border/50" />

                  {/* Routers section */}
                  <div>
                    <div className="flex items-center justify-between p-4 border-b border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-muted/50 flex items-center justify-center">
                          <Zap className="size-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium text-foreground">Роутеры</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          routersOnline === routerStatuses.length 
                            ? 'bg-emerald-500/10 text-emerald-500' 
                            : 'bg-red-500/10 text-red-500'
                        }`}>
                          {routersOnline === routerStatuses.length ? 'АКТИВНЫ' : 'ПРОБЛЕМЫ'} {routersOnline}/{routerStatuses.length}
                        </span>
                      </div>
                    </div>
                    
                    <div className="divide-y divide-border/50">
                      {routerStatuses.map((status) => <StatusItem key={status.id} status={status} />)}
                      {routerStatuses.length === 0 && (
                        <div className="px-4 py-6 text-sm text-muted-foreground text-center">Нет роутеров</div>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border/50" />

                  {/* Web section */}
                  <div>
                    <div className="flex items-center justify-between p-4 border-b border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-muted/50 flex items-center justify-center">
                          <Globe className="size-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium text-foreground">Веб-сервисы</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          webOnline === webStatuses.length 
                            ? 'bg-emerald-500/10 text-emerald-500' 
                            : 'bg-red-500/10 text-red-500'
                        }`}>
                          {webOnline === webStatuses.length ? 'АКТИВНЫ' : 'ПРОБЛЕМЫ'} {webOnline}/{webStatuses.length}
                        </span>
                      </div>
                    </div>
                    
                    <div className="divide-y divide-border/50">
                      {webStatuses.map((status) => <StatusItem key={status.id} status={status} />)}
                      {webStatuses.length === 0 && (
                        <div className="px-4 py-6 text-sm text-muted-foreground text-center">Нет сервисов</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {showNewStatus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="font-medium text-foreground">Новый статус</h2>
                <button onClick={() => setShowNewStatus(false)} className="size-8 rounded-lg flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                  <X className="size-4" />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  const form = e.target as HTMLFormElement
                  const formData = new FormData(form)
                  try {
                    const r = await fetch('/api/admin/status', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: formData.get('name'),
                        type: formData.get('type'),
                        url: formData.get('url') || null,
                        nodeId: formData.get('nodeId') || null,
                        routerIp: formData.get('routerIp') || null,
                        routerPort: formData.get('routerPort') ? parseInt(formData.get('routerPort') as string) : null,
                      }),
                    })
                    if (r.ok) {
                      loadServiceStatuses()
                      setShowNewStatus(false)
                      notify.success('Статус создан')
                    }
                  } catch {}
                }}
                className="p-5 space-y-4"
              >
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Название</label>
                  <input type="text" name="name" required className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Тип</label>
                  <select name="type" required className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none">
                    <option value="NODE">Узел (Node)</option>
                    <option value="WEB">Веб-сайт</option>
                    <option value="GAME">Игровая панель</option>
                    <option value="ROUTER">Роутер</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">URL (для WEB)</label>
                  <input type="url" name="url" placeholder="https://example.com" className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">IP адрес (для ROUTER)</label>
                  <input type="text" name="routerIp" placeholder="192.168.1.1" className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Порт пинга (для ROUTER)</label>
                  <input type="number" name="routerPort" placeholder="80" className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Узел (для NODE)</label>
                  <select name="nodeId" className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none">
                    <option value="">Не выбран</option>
                    {nodes.map((node) => (
                      <option key={node.id} value={node.id}>{node.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowNewStatus(false)} className="flex-1 px-4 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">Отмена</button>
                  <button type="submit" className="flex-1 px-4 py-2 text-sm rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors">Создать</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingStatus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="font-medium text-foreground">Редактировать статус</h2>
                <button onClick={() => setEditingStatus(null)} className="size-8 rounded-lg flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                  <X className="size-4" />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  const form = e.target as HTMLFormElement
                  const formData = new FormData(form)
                  try {
                    const r = await fetch('/api/admin/status', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        id: editingStatus.id,
                        name: formData.get('name'),
                        url: formData.get('url') || null,
                        nodeId: formData.get('nodeId') || null,
                        sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
                      }),
                    })
                    if (r.ok) {
                      loadServiceStatuses()
                      setEditingStatus(null)
                      notify.success('Статус обновлён')
                    }
                  } catch {}
                }}
                className="p-5 space-y-4"
              >
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Название</label>
                  <input type="text" name="name" required defaultValue={editingStatus.name} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Тип</label>
                  <input type="text" disabled value={editingStatus.type === 'WEB' ? 'Веб-сайт' : editingStatus.type === 'GAME' ? 'Pterodactyl Panel' : 'Игровой узел'} className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm text-muted-foreground" />
                </div>
                {editingStatus.type === 'WEB' && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">URL</label>
                    <input type="url" name="url" placeholder="https://example.com" defaultValue={editingStatus.url || ''} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                  </div>
                )}
                {editingStatus.type === 'NODE' && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Узел</label>
                    <select name="nodeId" defaultValue={editingStatus.nodeId || ''} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none">
                      <option value="">Не выбран</option>
                      {nodes.map((node) => (
                        <option key={node.id} value={node.id}>{node.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Порядок сортировки</label>
                  <input type="number" name="sortOrder" defaultValue={editingStatus.sortOrder} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setEditingStatus(null)} className="flex-1 px-4 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">Отмена</button>
                  <button type="submit" className="flex-1 px-4 py-2 text-sm rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors">Сохранить</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "smtp" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading text-2xl font-bold text-foreground">SMTP</h1>
                <p className="text-muted-foreground">Настройки почтового сервера для отправки писем</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* SMTP Settings */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <Mail className="size-5" />
                  Настройки сервера
                </h2>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">SMTP Хост</label>
                      <input
                        type="text"
                        value={smtpSettings.host}
                        onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
                        placeholder="smtp.example.com"
                        className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Порт</label>
                      <input
                        type="text"
                        value={smtpSettings.port}
                        onChange={(e) => setSmtpSettings({ ...smtpSettings, port: e.target.value })}
                        placeholder="587"
                        className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Пользователь (Email)</label>
                    <input
                      type="email"
                      value={smtpSettings.user}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, user: e.target.value })}
                      placeholder="noreply@example.com"
                      className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Пароль</label>
                    <input
                      type="password"
                      value={smtpSettings.password}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">От кого (From)</label>
                    <input
                      type="text"
                      value={smtpSettings.from}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, from: e.target.value })}
                      placeholder="Avelon <noreply@yourdomain.ru>"
                      className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smtpSettings.secure}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, secure: e.target.checked })}
                      className="size-4 rounded border-border"
                    />
                    <span className="text-sm text-muted-foreground">SSL/TLS (порт 465)</span>
                  </label>

                  <button
                    onClick={saveSmtpSettings}
                    disabled={smtpSaving}
                    className="w-full px-4 py-2.5 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {smtpSaving ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Save className="size-4" />
                        Сохранить настройки
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Test SMTP */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <Zap className="size-5" />
                  Тестирование
                </h2>

                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Отправьте тестовое письмо, чтобы проверить настройки SMTP.
                  </p>

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Email для теста</label>
                    <input
                      type="email"
                      value={smtpTestEmail}
                      onChange={(e) => setSmtpTestEmail(e.target.value)}
                      placeholder="test@example.com"
                      className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <button
                    onClick={testSmtp}
                    disabled={smtpTesting || !smtpTestEmail}
                    className="w-full px-4 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {smtpTesting ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Mail className="size-4" />
                        Отправить тестовое письмо
                      </>
                    )}
                  </button>

                  <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border">
                    <h3 className="text-sm font-medium text-foreground mb-2">Используется для:</h3>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Восстановление пароля</li>
                      <li>• Уведомления о платежах</li>
                      <li>• Уведомления об истечении серверов</li>
                      <li>• Приветственные письма</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "logs" && (
          <AdminLogsTable />
        )}

        {activeTab === "dedicated" && (
          <ServiceManager serviceType="dedicated" users={users} />
        )}

        {activeTab === "domains" && (
          <ServiceManager serviceType="domain" users={users} />
        )}

        {activeTab === "storagebox" && (
          <ServiceManager serviceType="storagebox" users={users} />
        )}

        {activeTab === "settings" && (
          <SettingsTab
            plans={plans}
            eggs={eggs}
            promos={promos}
            globalDiscount={globalDiscount}
            snowEnabled={snowEnabled}
            maintenanceMode={maintenanceMode}
            serverCreationDisabled={serverCreationDisabled}
            onLoadPlans={loadPlans}
            onLoadPromos={loadPromos}
          />
        )}
      </main>


      {(editingPlan || showNewPlan) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl bg-card border border-border shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-medium text-foreground">{editingPlan ? 'Редактировать тариф' : 'Новый тариф'}</h2>
              <button onClick={() => { setEditingPlan(null); setShowNewPlan(false) }} className="size-8 rounded-lg flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                <X className="size-4" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(85vh-120px)] px-5 py-4">
              <form
                id="plan-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  const form = e.target as HTMLFormElement
                  const formData = new FormData(form)
                  const allowedEggIds = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="allowedEggs"]:checked')).map(cb => cb.value)
                  const category = formData.get('category') as string
                  
                  // VDS-специфичные поля
                  const vmPresetIdStr = formData.get('vmPresetId') as string
                  const vmClusterIdStr = formData.get('vmClusterId') as string
                  const vmNodeIdStr = formData.get('vmNodeId') as string
                  const vmNodeStrategy = formData.get('vmNodeStrategy') as string
                  const vmIpPoolIdStr = formData.get('vmIpPoolId') as string
                  
                  // VDS кастомные спецификации
                  let vdsCustomSpecs = null
                  if (category === 'VDS') {
                    const cpuModel = formData.get('cpuModel') as string
                    const city = formData.get('city') as string
                    const country = formData.get('country') as string
                    const vdsType = formData.get('vdsType') as string
                    const vdsLocation = formData.get('vdsLocation') as string
                    
                    vdsCustomSpecs = JSON.stringify({
                      cpuModel: cpuModel || '',
                      city: city || '',
                      country: country || '',
                      vdsType: vdsType || 'STANDARD',
                      vdsLocation: vdsLocation || 'DE'
                    })
                  }
                  
                  savePlan({
                    id: editingPlan?.id,
                    name: formData.get('name') as string,
                    slug: formData.get('slug') as string,
                    description: formData.get('description') as string || null,
                    category,
                    ram: parseInt(formData.get('ram') as string),
                    cpu: parseInt(formData.get('cpu') as string),
                    disk: parseInt(formData.get('disk') as string),
                    databases: parseInt(formData.get('databases') as string) || 1,
                    backups: parseInt(formData.get('backups') as string) || 3,
                    price: parseFloat(formData.get('price') as string),
                    isFree: formData.get('isFree') === 'on',
                    mobIcon: formData.get('mobIcon') as string || null,
                    customIcon: formData.get('customIcon') as string || null,
                    isActive: (formData.get('isActive') as string) === 'true',
                    sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
                    allowedEggIds,
                    // VDS fields
                    vmPresetId: vmPresetIdStr ? parseInt(vmPresetIdStr) : null,
                    vmClusterId: vmClusterIdStr ? parseInt(vmClusterIdStr) : null,
                    vmNodeId: vmNodeIdStr ? parseInt(vmNodeIdStr) : null,
                    vmNodeStrategy: vmNodeStrategy || 'auto',
                    vmIpPoolId: vmIpPoolIdStr ? parseInt(vmIpPoolIdStr) : null,
                    vdsCustomSpecs,
                  })
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Название</label>
                    <input type="text" name="name" required defaultValue={editingPlan?.name || ''} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Slug</label>
                    <input type="text" name="slug" required defaultValue={editingPlan?.slug || ''} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Категория</label>
                    <input type="hidden" name="category" value={planCategory} />
                    <CustomSelect
                      options={[
                        { value: 'MINECRAFT', label: 'Minecraft', icon: <div className="size-4 bg-green-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">M</div> },
                        { value: 'CODING', label: 'Coding', icon: <div className="size-4 bg-blue-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">C</div> },
                        { value: 'VDS', label: 'VDS', icon: <Cloud className="size-4 text-purple-500" /> }
                      ]}
                      value={planCategory}
                      onChange={setPlanCategory}
                      placeholder="Выберите категорию"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Цена (₽)</label>
                    <input type="number" name="price" required min="0" step="0.01" defaultValue={editingPlan?.price ?? 0} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Порядок</label>
                    <input type="number" name="sortOrder" defaultValue={editingPlan?.sortOrder || 0} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                  </div>
                </div>

                {/* VDS-специфичные поля */}
                {planCategory === 'VDS' && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-3">
                    <p className="text-xs text-blue-400 font-medium flex items-center gap-1.5">
                      <Cloud className="size-3.5" />
                      Настройки VMManager6
                    </p>
                    <input type="hidden" name="vmPresetId" value={planFormPreset} />
                    <input type="hidden" name="vmClusterId" value={planFormCluster} />
                    <input type="hidden" name="vmNodeId" value={planFormNode} />
                    <input type="hidden" name="vmNodeStrategy" value={planFormNodeStrategy} />
                    <input type="hidden" name="vmIpPoolId" value={planFormIpPool} />
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1.5">Пресет</label>
                        <CustomSelect
                          options={[
                            { value: '', label: 'Не выбран', icon: <XCircle className="size-4 text-muted-foreground" /> },
                            ...vmPresets.map((preset: any) => {
                              const totalDiskMib = preset.disks?.reduce((sum: number, disk: any) => sum + (disk.size_mib || 0), 0) || 0
                              const totalDiskGib = Math.round(totalDiskMib / 1024)
                              return {
                                value: preset.id.toString(),
                                label: preset.name,
                                sublabel: `${preset.cpu_number} vCPU • ${preset.ram_mib >= 1024 ? (Number.isInteger(preset.ram_mib / 1024) ? preset.ram_mib / 1024 : (preset.ram_mib / 1024).toFixed(1)) + ' GB' : preset.ram_mib + ' MB'} RAM • ${totalDiskGib} GB SSD`,
                                icon: <Server className="size-4 text-blue-500" />
                              }
                            })
                          ]}
                          value={planFormPreset}
                          onChange={setPlanFormPreset}
                          placeholder="Выберите пресет"
                          searchable={true}
                          clearable={true}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1.5">Кластер</label>
                        <CustomSelect
                          options={[
                            { value: '', label: 'Не выбран', icon: <XCircle className="size-4 text-muted-foreground" /> },
                            ...vmClusters.filter((c: any) => c.isActive).map((cluster: any) => ({
                              value: cluster.vmManagerId.toString(),
                              label: cluster.name,
                              icon: <Globe className="size-4 text-green-500" />
                            }))
                          ]}
                          value={planFormCluster}
                          onChange={(value) => {
                            setPlanFormCluster(value)
                            // Сбрасываем выбранную ноду при смене кластера
                            setPlanFormNode('')
                          }}
                          placeholder="Выберите кластер"
                          searchable={true}
                          clearable={true}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1.5">Нода</label>
                        {/* Debug info */}
                        {(() => {
                          console.log('[Admin] Rendering node selector:', {
                            vmNodesLength: vmNodes.length,
                            vmNodesData: vmNodes.map(n => ({ id: n.id, name: n.name, cluster: n.cluster })),
                            planFormCluster,
                            filteredNodesCount: vmNodes.filter((node: any) => !planFormCluster || node.cluster?.toString() === planFormCluster).length
                          })
                          
                          const filteredNodes = vmNodes.filter((node: any) => {
                            const matches = !planFormCluster || node.cluster?.toString() === planFormCluster
                            console.log(`[Admin] Node filter: ${node.name} (cluster: ${node.cluster}) matches cluster ${planFormCluster}: ${matches}`)
                            return matches
                          })
                          
                          console.log('[Admin] Filtered nodes count:', filteredNodes.length)
                          console.log('[Admin] Filtered nodes:', filteredNodes.map(n => ({ id: n.id, name: n.name, cluster: n.cluster })))
                          
                          return null
                        })()}
                        <CustomSelect
                          options={[
                            { value: '', label: 'Авто', icon: <Zap className="size-4 text-amber-500" /> },
                            ...vmNodes
                              .filter((node: any) => {
                                const matches = !planFormCluster || node.cluster?.toString() === planFormCluster
                                console.log(`[Admin] Node filter: ${node.name} (cluster: ${node.cluster}) matches cluster ${planFormCluster}: ${matches}`)
                                return matches
                              })
                              .map((node: any) => ({
                                value: node.id.toString(),
                                label: node.name,
                                sublabel: `${node.is_active ? 'Активна' : 'Неактивна'} • Кластер ${node.cluster || 'N/A'}`,
                                icon: <Server className="size-4 text-blue-500" />
                              }))
                          ]}
                          value={planFormNode}
                          onChange={setPlanFormNode}
                          placeholder="Выберите ноду"
                          searchable={true}
                          clearable={true}
                          disabled={!planFormCluster}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1.5">IP Pool</label>
                        <CustomSelect
                          options={[
                            { value: '', label: 'Авто', icon: <Zap className="size-4 text-amber-500" /> },
                            ...vmIpPools.map((pool: any) => ({
                              value: pool.id.toString(),
                              label: pool.name,
                              sublabel: `${pool.family} • ${pool.available} свободно`,
                              icon: <Globe className="size-4 text-blue-500" />
                            }))
                          ]}
                          value={planFormIpPool}
                          onChange={setPlanFormIpPool}
                          placeholder="Выберите IP Pool"
                          searchable={true}
                          clearable={true}
                        />
                      </div>
                    </div>
                    
                    {/* Стратегия выбора ноды */}
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Стратегия выбора ноды</label>
                      <CustomSelect
                        options={[
                          { value: 'auto', label: 'Автоматически', sublabel: 'Умный выбор на основе нагрузки и здоровья', icon: <Zap className="size-4 text-amber-500" /> },
                          { value: 'load-balanced', label: 'Балансировка нагрузки', sublabel: 'Выбор ноды с наименьшей нагрузкой', icon: <BarChart3 className="size-4 text-blue-500" /> },
                          { value: 'health-based', label: 'По здоровью', sublabel: 'Выбор самой здоровой ноды', icon: <Heart className="size-4 text-green-500" /> },
                          { value: 'specific', label: 'Конкретная нода', sublabel: 'Использовать только выбранную ноду', icon: <Target className="size-4 text-red-500" /> }
                        ]}
                        value={planFormNodeStrategy}
                        onChange={setPlanFormNodeStrategy}
                        placeholder="Выберите стратегию"
                        searchable={false}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Выберите пресет ИЛИ кластер. Пресет определяет конфигурацию VM.
                    </p>
                    
                    {/* Дополнительные настройки VDS */}
                    <div className="pt-3 border-t border-border/50 space-y-3">
                      <p className="text-xs text-blue-400 font-medium">Дополнительные параметры</p>
                      
                      {/* Тип VDS и Локация */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1.5">Тип VDS</label>
                          <input type="hidden" name="vdsType" value={planFormVdsType} />
                          <CustomSelect
                            options={[
                              { value: 'STANDARD', label: 'VDS', icon: <Cloud className="size-4 text-blue-500" /> },
                              { value: 'PROMO', label: 'VDS PROMO', icon: <Zap className="size-4 text-amber-500" /> }
                            ]}
                            value={planFormVdsType}
                            onChange={(val) => {
                              setPlanFormVdsType(val)
                              // Если выбран PROMO, автоматически ставим Германию
                              if (val === 'PROMO') {
                                setPlanFormVdsLocation('DE')
                              }
                            }}
                            placeholder="Выберите тип"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1.5">Локация</label>
                          <input type="hidden" name="vdsLocation" value={planFormVdsLocation} />
                          <CustomSelect
                            options={
                              planFormVdsType === 'PROMO' 
                                ? [{ value: 'DE', label: 'Germany', icon: <img src="/de.png" className="size-4 rounded" /> }]
                                : [
                                    { value: 'DE', label: 'Germany', icon: <img src="/de.png" className="size-4 rounded" /> },
                                    { value: 'RU', label: 'Russia', icon: <img src="/ru.png" className="size-4 rounded" /> }
                                  ]
                            }
                            value={planFormVdsLocation}
                            onChange={setPlanFormVdsLocation}
                            placeholder="Выберите локацию"
                            disabled={planFormVdsType === 'PROMO'}
                          />
                        </div>
                      </div>
                      
                      {/* Процессор */}
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1.5">Модель процессора</label>
                        <input 
                          type="text" 
                          name="cpuModel" 
                          value={planFormCpuModel}
                          onChange={(e) => setPlanFormCpuModel(e.target.value)}
                          placeholder="Intel i5-12500A" 
                          className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" 
                        />
                      </div>
                      
                      {/* Город и Страна */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1.5">Город</label>
                          <input 
                            type="text" 
                            name="city" 
                            value={planFormCity}
                            onChange={(e) => setPlanFormCity(e.target.value)}
                            placeholder="Frankfurt" 
                            className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1.5">Страна</label>
                          <input 
                            type="text" 
                            name="country" 
                            value={planFormCountry}
                            onChange={(e) => setPlanFormCountry(e.target.value)}
                            placeholder="Germany" 
                            className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* RAM/CPU/Disk - только для Minecraft/Coding */}
                {planCategory !== 'VDS' && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">RAM (MB)</label>
                      <input type="number" name="ram" required min="128" defaultValue={editingPlan?.ram || 1024} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">CPU (%)</label>
                      <input type="number" name="cpu" required min="10" defaultValue={editingPlan?.cpu || 100} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Диск (MB)</label>
                      <input type="number" name="disk" required min="1024" defaultValue={editingPlan?.disk || 10240} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                    </div>
                  </div>
                )}

                {/* Скрытые поля для VDS с дефолтными значениями */}
                {planCategory === 'VDS' && (
                  <>
                    <input type="hidden" name="ram" value="0" />
                    <input type="hidden" name="cpu" value="0" />
                    <input type="hidden" name="disk" value="0" />
                    <input type="hidden" name="databases" value="0" />
                    <input type="hidden" name="backups" value="0" />
                  </>
                )}

                {/* БД и Бэкапы - только для Minecraft/Coding */}
                {planCategory !== 'VDS' && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">БД</label>
                      <input type="number" name="databases" min="0" defaultValue={editingPlan?.databases || 1} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Бэкапы</label>
                      <input type="number" name="backups" min="0" defaultValue={editingPlan?.backups || 3} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Статус</label>
                      <input type="hidden" name="isActive" value={planFormStatus} />
                      <StatusSelect
                        options={[
                          { value: 'true', label: 'Активен', color: 'green' },
                          { value: 'false', label: 'Неактивен', color: 'red' }
                        ]}
                        value={planFormStatus}
                        onChange={setPlanFormStatus}
                        placeholder="Выберите статус"
                      />
                    </div>
                  </div>
                )}

                {/* Статус - для VDS отдельно */}
                {(planCategory === 'VDS' || editingPlan?.category === 'VDS') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Статус</label>
                      <input type="hidden" name="isActive" value={planFormStatus} />
                      <StatusSelect
                        options={[
                          { value: 'true', label: 'Активен', color: 'green' },
                          { value: 'false', label: 'Неактивен', color: 'red' }
                        ]}
                        value={planFormStatus}
                        onChange={setPlanFormStatus}
                        placeholder="Выберите статус"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Кастомная иконка (URL)</label>
                      <input type="text" name="customIcon" placeholder="https://example.com/icon.png" defaultValue={editingPlan?.customIcon || ''} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                    </div>
                  </div>
                )}

                {/* Иконки - только для Minecraft/Coding */}
                {planCategory !== 'VDS' && editingPlan?.category !== 'VDS' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Иконка mobIcon</label>
                      <input type="text" name="mobIcon" placeholder="Например: diamond" defaultValue={editingPlan?.mobIcon || ''} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Кастомная иконка (URL)</label>
                      <input type="text" name="customIcon" placeholder="https://example.com/icon.png" defaultValue={editingPlan?.customIcon || ''} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input type="checkbox" name="isFree" id="isFree" defaultChecked={editingPlan?.isFree || false} className="size-4 rounded border-border" />
                  <label htmlFor="isFree" className="text-xs text-muted-foreground cursor-pointer">Бесплатный тариф</label>
                </div>

                {/* Ядра - только для Minecraft/Coding */}
                {planCategory !== 'VDS' && editingPlan?.category !== 'VDS' && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Ядра</label>
                    <div className="max-h-32 overflow-y-auto rounded-lg bg-accent/50 border border-border">
                      {eggs.filter(e => e.isActive).length === 0 ? (
                        <p className="text-muted-foreground text-xs p-3 text-center">Нет активных ядер</p>
                      ) : (
                        eggs.filter(e => e.isActive).map((egg) => (
                          <label key={egg.id} className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer text-sm">
                            <input type="checkbox" name="allowedEggs" value={egg.id} defaultChecked={editingPlan?.eggOptions?.some(opt => opt.eggId === egg.id) || false} className="size-3.5 rounded border-border" />
                            <span className="text-foreground">{egg.name}</span>
                            {egg.nestName && <span className="text-xs text-muted-foreground">({egg.nestName})</span>}
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
              <button type="button" onClick={() => { setEditingPlan(null); setShowNewPlan(false) }} className="px-4 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">Отмена</button>
              <button type="submit" form="plan-form" className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors">
                <Save className="size-3.5" />
                {editingPlan ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-medium text-foreground">Редактировать пользователя</h2>
              <button onClick={() => setEditingUser(null)} className="size-8 rounded-lg flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                <X className="size-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Имя</label>
                <input
                  type="text"
                  value={editingUserForm.name}
                  onChange={(e) => setEditingUserForm({ ...editingUserForm, name: e.target.value })}
                  placeholder="Оставить пусто для удаления"
                  className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  value={editingUserForm.email}
                  onChange={(e) => setEditingUserForm({ ...editingUserForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Баланс (₽)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingUserForm.balance}
                  onChange={(e) => setEditingUserForm({ ...editingUserForm, balance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Роль</label>
                <select
                  value={editingUserForm.role}
                  onChange={(e) => setEditingUserForm({ ...editingUserForm, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Новый пароль</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingUserForm.newPassword}
                    onChange={(e) => setEditingUserForm({ ...editingUserForm, newPassword: e.target.value })}
                    placeholder="Оставить пусто без изменений"
                    className="flex-1 px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingUserForm({ ...editingUserForm, newPassword: generateRandomPassword() })}
                    className="px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground hover:bg-accent/80 transition-colors"
                  >
                    Генерировать
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-4 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSaveUser}
                  className="flex-1 px-4 py-2 text-sm rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-medium text-foreground">Редактировать ноду</h2>
              <button onClick={() => setEditingNode(null)} className="size-8 rounded-lg flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                <X className="size-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const formData = new FormData(form)
                const isFreeCheckbox = form.querySelector('input[id="nodeFree"]') as HTMLInputElement
                const priceModifierValue = formData.get('priceModifier') as string
                updateNode(editingNode.id, { priceModifier: priceModifierValue ? parseFloat(priceModifierValue) : 0, isActive: (formData.get('isActive') as string) === 'true', countryCode: selectedCountryCode, isFree: isFreeCheckbox?.checked || false, allowCreation: (formData.get('allowCreation') as string) === 'true', nodeType: selectedNodeType })
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Название</label>
                <input type="text" disabled value={editingNode.name} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-muted-foreground" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Наценка (₽)</label>
                <input 
                  type="number" 
                  name="priceModifier" 
                  step="0.01" 
                  defaultValue={editingNode.priceModifier}
                  disabled={editingNode.isFree}
                  className={`w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none transition-colors ${
                    editingNode.isFree 
                      ? 'bg-muted/30 text-muted-foreground cursor-not-allowed' 
                      : 'bg-accent text-foreground'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Локация</label>
                <div className="flex gap-1.5">
                  {[
                    { code: '', label: 'Нет' },
                    { code: 'ru', label: 'RU' },
                    { code: 'de', label: 'DE' },
                    { code: 'fr', label: 'FR' },
                    { code: 'nl', label: 'NL' },
                    { code: 'ua', label: 'UA' },
                    { code: 'br', label: 'BR' },
                    { code: 'fi', label: 'FI' },
                  ].map(({ code, label }) => (
                    <button
                      key={code}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        setSelectedCountryCode(code)
                      }}
                      className={`px-3 py-1.5 rounded border-2 transition-all text-xs font-medium ${
                        selectedCountryCode === code
                          ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                          : 'border-border hover:border-border/70 text-muted-foreground'
                      }`}
                    >
                      {code === '' ? label : <img src={code === 'fi' ? '/finland.png' : `/${code}.png`} alt={label} className="w-6 h-4 object-cover rounded" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Статус</label>
                  <select name="isActive" defaultValue={editingNode.isActive ? 'true' : 'false'} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none appearance-none cursor-pointer" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '28px'}}>
                    <option value="true">Активна</option>
                    <option value="false">Неактивна</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Создание</label>
                  <select name="allowCreation" defaultValue={editingNode.allowCreation !== false ? 'true' : 'false'} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none appearance-none cursor-pointer" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '28px'}}>
                    <option value="true">Разрешено</option>
                    <option value="false">Запрещено</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Узел для</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedNodeType('MINECRAFT')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedNodeType === 'MINECRAFT'
                        ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500'
                        : 'bg-accent border-2 border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Minecraft
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedNodeType('CODING')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedNodeType === 'CODING'
                        ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-500'
                        : 'bg-accent border-2 border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Coding
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    id="nodeFree" 
                    defaultChecked={editingNode.isFree || false}
                    onChange={(e) => {
                      const hiddenInput = document.querySelector('input[name="isFree"]') as HTMLInputElement
                      if (hiddenInput) hiddenInput.value = e.target.checked ? 'on' : ''
                    }}
                    className="appearance-none size-4 rounded-full border border-border bg-muted/30 checked:bg-white checked:border-white transition-colors" 
                  />
                  <svg className="absolute inset-0 size-4 text-foreground pointer-events-none hidden checked:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-xs text-muted-foreground">Бесплатный узел</span>
                <input type="hidden" name="isFree" defaultValue={editingNode.isFree ? 'on' : ''} />
              </label>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditingNode(null)} className="flex-1 px-4 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">Отмена</button>
                <button type="submit" className="flex-1 px-4 py-2 text-sm rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-medium text-foreground">Редактировать промокод</h2>
              <button onClick={() => setEditingPromo(null)} className="size-8 rounded-lg flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                <X className="size-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const formData = new FormData(form)
                savePromo({
                  id: editingPromo.id,
                  code: formData.get('code') as string,
                  type: formData.get('type') as 'DISCOUNT' | 'BALANCE',
                  value: parseFloat(formData.get('value') as string),
                  maxUses: formData.get('maxUses') ? parseInt(formData.get('maxUses') as string) : null,
                  expiresAt: formData.get('expiresAt') as string || null,
                })
              }}
              className="p-5 space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Код</label>
                  <input type="text" name="code" required defaultValue={editingPromo.code} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground uppercase focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Тип</label>
                  <select name="type" required defaultValue={editingPromo.type} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none">
                    <option value="DISCOUNT">Скидка (%)</option>
                    <option value="BALANCE">Баланс (₽)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Значение</label>
                  <input type="number" name="value" required min="0" step="0.01" defaultValue={editingPromo.value} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Макс. использований</label>
                  <input type="number" name="maxUses" min="1" defaultValue={editingPromo.maxUses || ''} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Истекает</label>
                <input type="datetime-local" name="expiresAt" defaultValue={editingPromo.expiresAt ? new Date(editingPromo.expiresAt).toISOString().slice(0, 16) : ''} className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditingPromo(null)} className="flex-1 px-4 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">Отмена</button>
                <button type="submit" className="flex-1 px-4 py-2 text-sm rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
