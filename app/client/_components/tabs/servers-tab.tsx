"use client"

import Link from "next/link"
import { Server, Plus, Loader2, ExternalLink, ChevronDown, Trash2, Clock, Calendar, RefreshCw, Cloud, Monitor, Globe, Copy, Dices, Eye, EyeOff, Check, MemoryStick, Cpu, HardDrive, Wallet, Activity, Code, Key, Terminal } from "lucide-react"
import { User, ServerData, VdsServer, locationFlags } from "../types"
import { formatBytes, calculateRefund, formatTimeRemaining } from "../utils"
import { useState, useCallback, useRef, useEffect } from "react"
import { toast } from "sonner"
import { OtherServicesSection } from "./other-services-section-new"
import { StartupCommandModal } from "../modals/startup-command-modal"

// Генерация случайного пароля
function generatePassword(length: number = 16): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  let password = "aA1!"
  for (let i = 4; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

// OS логотипы
const osLogos: Record<string, string> = {
  ubuntu: "https://cdn.simpleicons.org/ubuntu/E95420",
  debian: "https://cdn.simpleicons.org/debian/A81D33",
  centos: "https://raw.githubusercontent.com/devicons/devicon/master/icons/centos/centos-original.svg",
  windows: "https://raw.githubusercontent.com/devicons/devicon/master/icons/windows11/windows11-original.svg",
  freebsd: "https://cdn.simpleicons.org/freebsd/AB2B28",
  alma: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/AlmaLinux_Icon_Logo.svg/960px-AlmaLinux_Icon_Logo.svg.png",
  almalinux: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/AlmaLinux_Icon_Logo.svg/960px-AlmaLinux_Icon_Logo.svg.png",
  rocky: "https://cdn.simpleicons.org/rockylinux/10B981",
  oracle: "https://www.svgrepo.com/show/448245/oracle.svg",
}

function getOsLogo(osName: string): string | null {
  const nameLower = osName.toLowerCase()
  for (const [key, url] of Object.entries(osLogos)) {
    if (nameLower.includes(key)) return url
  }
  return null
}

interface ServersTabProps {
  user: User
  servers: ServerData[]
  vdsServers: VdsServer[]
  loadingServers: boolean
  loadingVds: boolean
  expandedServerId: string | null
  setExpandedServerId: (id: string | null) => void
  onDeleteClick: (server: ServerData) => void
  onRenewServer?: (serverId: string) => Promise<void>
  renewingServerId?: string | null
  osImages?: Array<{ vmManagerId: number; name: string }>
  onReinstallVds?: (hostId: number, osId: number, password: string) => Promise<void>
  reinstallingVdsId?: number | null
  onRenewVds?: (hostId: number) => Promise<void>
  renewingVdsId?: number | null
}

export function ServersTab({
  user,
  servers,
  vdsServers,
  loadingServers,
  loadingVds,
  expandedServerId,
  setExpandedServerId,
  onDeleteClick,
  onRenewServer,
  renewingServerId,
  osImages,
  onReinstallVds,
  reinstallingVdsId,
  onRenewVds,
  renewingVdsId,
}: ServersTabProps) {
  const [expandedVdsId, setExpandedVdsId] = useState<string | null>(null)
  const [openingPanelId, setOpeningPanelId] = useState<number | null>(null)
  const [otherServicesCount, setOtherServicesCount] = useState(0)
  const totalServers = servers.length + vdsServers.length + otherServicesCount
  const isLoading = loadingServers || loadingVds

  // Startup command modal state
  const [startupModalServer, setStartupModalServer] = useState<ServerData | null>(null)

  // Password change modal state (moved to parent level)
  const [passwordModalVds, setPasswordModalVds] = useState<VdsServer | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isGeneratingNew, setIsGeneratingNew] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [isClosingPasswordModal, setIsClosingPasswordModal] = useState(false)

  // Reinstall modal state (moved to parent level)
  const [reinstallModalVds, setReinstallModalVds] = useState<VdsServer | null>(null)
  const [reinstallOs, setReinstallOs] = useState<number | null>(null)
  const [reinstallPassword, setReinstallPassword] = useState('')
  const [showReinstallPassword, setShowReinstallPassword] = useState(false)
  const [isGeneratingReinstall, setIsGeneratingReinstall] = useState(false)
  const [isClosingReinstallModal, setIsClosingReinstallModal] = useState(false)
  const [openOsDropdown, setOpenOsDropdown] = useState<string | null>(null)
  const reinstallDropdownRef = useRef<HTMLDivElement>(null)

  // Close OS dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reinstallDropdownRef.current && !reinstallDropdownRef.current.contains(e.target as HTMLElement)) {
        setOpenOsDropdown(null)
      }
    }
    if (openOsDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openOsDropdown])

  // Генерация пароля для смены
  const generateAnimatedNewPassword = useCallback(() => {
    setIsGeneratingNew(true)
    setNewPassword('')
    
    const targetPassword = generatePassword()
    let currentIndex = 0
    
    const interval = setInterval(() => {
      if (currentIndex <= targetPassword.length) {
        setNewPassword(targetPassword.slice(0, currentIndex))
        currentIndex++
      } else {
        clearInterval(interval)
        setIsGeneratingNew(false)
      }
    }, 30)
  }, [])

  // Генерация пароля для переустановки
  const generateAnimatedReinstallPassword = useCallback(() => {
    setIsGeneratingReinstall(true)
    setReinstallPassword('')
    
    const targetPassword = generatePassword()
    let currentIndex = 0
    
    const interval = setInterval(() => {
      if (currentIndex <= targetPassword.length) {
        setReinstallPassword(targetPassword.slice(0, currentIndex))
        currentIndex++
      } else {
        clearInterval(interval)
        setIsGeneratingReinstall(false)
      }
    }, 30)
  }, [])

  // Закрытие модалки пароля
  const closePasswordModal = useCallback(() => {
    setIsClosingPasswordModal(true)
    setTimeout(() => {
      setPasswordModalVds(null)
      setNewPassword('')
      setShowNewPassword(false)
      setIsClosingPasswordModal(false)
    }, 150)
  }, [])

  // Закрытие модалки переустановки
  const closeReinstallModal = useCallback(() => {
    setIsClosingReinstallModal(true)
    setTimeout(() => {
      setReinstallModalVds(null)
      setReinstallOs(null)
      setReinstallPassword('')
      setShowReinstallPassword(false)
      setOpenOsDropdown(null)
      setIsClosingReinstallModal(false)
    }, 150)
  }, [])

  // Смена пароля VDS
  const handleChangePassword = useCallback(async () => {
    if (!passwordModalVds || newPassword.length < 8 || changingPassword) return
    
    setChangingPassword(true)
    try {
      const res = await fetch(`/api/user/vds/${passwordModalVds.vmmanager6_host_id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      })
      const data = await res.json()
      
      if (res.ok && data.success) {
        toast.success('Пароль успешно изменён!')
        closePasswordModal()
      } else {
        toast.error(data.error || 'Не удалось изменить пароль')
      }
    } catch (error) {
      console.error('Password change error:', error)
      toast.error('Ошибка при смене пароля')
    } finally {
      setChangingPassword(false)
    }
  }, [newPassword, passwordModalVds, closePasswordModal, changingPassword])

  // Открыть панель VMManager через SSO
  const openVdsPanel = useCallback(async (hostId: number) => {
    setOpeningPanelId(hostId)
    try {
      const res = await fetch(`/api/user/vds/${hostId}/panel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await res.json()
      
      if (res.ok && data.panelUrl) {
        window.open(data.panelUrl, '_blank')
      } else {
        toast.error(data.error || 'Не удалось открыть панель')
      }
    } catch (error) {
      console.error('Panel open error:', error)
      toast.error('Ошибка при открытии панели')
    } finally {
      setOpeningPanelId(null)
    }
  }, [])

  return (
    <>
      <div className="max-w-5xl mx-auto pb-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Мои серверы</h1>
          <p className="text-sm text-muted-foreground">
            {totalServers > 0 
              ? `${totalServers} сервер${totalServers === 1 ? '' : totalServers < 5 ? 'а' : 'ов'}`
              : 'Нет активных серверов'}
          </p>
        </div>
        
        <Link 
          href="/client/create"
          className="flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 transition-colors duration-200"
        >
          <Plus className="size-4" />
          Создать сервер
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Пустое состояние - показываем только если нет вообще никаких серверов */}
          {totalServers === 0 && (
            <div className="rounded-2xl border border-border/50 bg-card/30 p-10 text-center">
              <h2 className="font-heading text-xl font-bold text-foreground mb-2">Начните прямо сейчас</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Создайте свой первый сервер за пару минут. Выберите тариф, настройте и запустите.
              </p>
              <Link 
                href="/client/create"
                className="inline-flex items-center gap-2 rounded-xl bg-foreground px-6 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 transition-colors duration-200"
              >
                <Plus className="size-4" />
                Создать первый сервер
              </Link>
            </div>
          )}

          {/* VDS серверы */}
          {vdsServers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Cloud className="size-4" />
                <span>VDS серверы ({vdsServers.length})</span>
              </div>
              {vdsServers.map((vds) => (
                <VdsCard
                  key={vds.id}
                  vds={vds}
                  isExpanded={expandedVdsId === vds.id}
                  onToggle={() => setExpandedVdsId(expandedVdsId === vds.id ? null : vds.id)}
                  openingPanelId={openingPanelId}
                  onOpenPanel={openVdsPanel}
                  onRenew={onRenewVds}
                  renewingId={renewingVdsId}
                  userBalance={user.balance}
                  onChangePassword={() => setPasswordModalVds(vds)}
                  onReinstallClick={() => setReinstallModalVds(vds)}
                  reinstallingId={reinstallingVdsId}
                />
              ))}
            </div>
          )}

          {/* Другие сервисы (Dedicated, Домены, StorageBox) - ВСЕГДА рендерим */}
          <OtherServicesSection 
            userBalance={user.balance}
            onBalanceUpdate={async () => {
              // Reload user data
              const res = await fetch('/api/auth/me')
              if (res.ok) {
                const data = await res.json()
                // User balance will be updated in parent
              }
            }}
            onServicesLoaded={(count) => setOtherServicesCount(count)}
          />

          {/* Minecraft серверы */}
          {servers.filter(s => s.plan.category !== 'CODING').length > 0 && (
            <div className="space-y-4">
              {(vdsServers.length > 0 || servers.filter(s => s.plan.category === 'CODING').length > 0) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Server className="size-4" />
                  <span>Игровые серверы ({servers.filter(s => s.plan.category !== 'CODING').length})</span>
                </div>
              )}
              {servers.filter(s => s.plan.category !== 'CODING').map((server) => {
                const isExpanded = expandedServerId === server.id
                return (
                  <ServerCard
                    key={server.id}
                    server={server}
                    user={user}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedServerId(isExpanded ? null : server.id)}
                    onDeleteClick={() => onDeleteClick(server)}
                    onRenewServer={onRenewServer}
                    isRenewing={renewingServerId === server.id}
                    onStartupClick={() => setStartupModalServer(server)}
                  />
                )
              })}
            </div>
          )}

          {/* Coding серверы */}
          {servers.filter(s => s.plan.category === 'CODING').length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Code className="size-4" />
                <span>Coding серверы ({servers.filter(s => s.plan.category === 'CODING').length})</span>
              </div>
              {servers.filter(s => s.plan.category === 'CODING').map((server) => {
                const isExpanded = expandedServerId === server.id
                return (
                  <ServerCard
                    key={server.id}
                    server={server}
                    user={user}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedServerId(isExpanded ? null : server.id)}
                    onDeleteClick={() => onDeleteClick(server)}
                    onRenewServer={onRenewServer}
                    isRenewing={renewingServerId === server.id}
                    isCoding={true}
                    onStartupClick={() => setStartupModalServer(server)}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}
      </div>

      {/* Модальное окно смены пароля VDS - на уровне всего экрана */}
      {passwordModalVds && (
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ${isClosingPasswordModal ? 'animate-out fade-out duration-150' : 'animate-in fade-in duration-200'}`} 
          onClick={closePasswordModal}
        >
          <div 
            className={`bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 ${isClosingPasswordModal ? 'animate-out zoom-out-95 duration-150' : 'animate-in zoom-in-95 duration-200'}`} 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Key className="size-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground">Смена пароля</h3>
                <p className="text-xs text-muted-foreground">Сервер: {passwordModalVds.name}</p>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Введите новый пароль root для вашего VDS сервера.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <Key className="size-4" />
                  Новый пароль
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Минимум 8 символов"
                      disabled={isGeneratingNew}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(newPassword).then(() => toast.success('Скопировано!'))}
                    disabled={!newPassword}
                    className="size-10 shrink-0 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center transition-all disabled:opacity-50"
                    title="Скопировать"
                  >
                    <Copy className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={generateAnimatedNewPassword}
                    disabled={isGeneratingNew}
                    className={`size-10 shrink-0 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center transition-all duration-300 ${isGeneratingNew ? 'animate-spin' : 'hover:rotate-180'}`}
                    title="Сгенерировать пароль"
                  >
                    <Dices className="size-4" />
                  </button>
                </div>
                {newPassword && (
                  <p className={`text-xs mt-1.5 transition-all duration-300 ${newPassword.length >= 8 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {newPassword.length >= 8 ? '✓ Пароль достаточно длинный' : `Ещё ${8 - newPassword.length} символов`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closePasswordModal}
                className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-all duration-200"
              >
                Отмена
              </button>
              <button
                onClick={handleChangePassword}
                disabled={newPassword.length < 8 || changingPassword}
                className="flex-1 rounded-lg bg-blue-500 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-all duration-200 disabled:opacity-50"
              >
                {changingPassword ? (
                  <Loader2 className="size-4 animate-spin mx-auto" />
                ) : (
                  'Сменить пароль'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно переустановки ОС - на уровне всего экрана */}
      {reinstallModalVds && (
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ${isClosingReinstallModal ? 'animate-out fade-out duration-150' : 'animate-in fade-in duration-200'}`} 
          onClick={closeReinstallModal}
        >
          <div 
            className={`bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 ${isClosingReinstallModal ? 'animate-out zoom-out-95 duration-150' : 'animate-in zoom-in-95 duration-200'}`} 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <RefreshCw className="size-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground">Переустановка ОС</h3>
                <p className="text-xs text-muted-foreground">Сервер: {reinstallModalVds.name}</p>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Все данные на сервере будут удалены. Это действие необратимо.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <Monitor className="size-4" />
                  Операционная система
                </label>
                {osImages && osImages.length > 0 ? (
                  <div ref={reinstallDropdownRef} className="grid grid-cols-2 gap-2">
                    {(() => {
                      const groups: Record<string, typeof osImages> = {}
                      osImages.forEach(os => {
                        const name = os.name.toLowerCase()
                        let group = "Другие"
                        if (name.includes("ubuntu")) group = "Ubuntu"
                        else if (name.includes("debian")) group = "Debian"
                        else if (name.includes("centos")) group = "CentOS"
                        else if (name.includes("alma")) group = "AlmaLinux"
                        else if (name.includes("rocky")) group = "Rocky Linux"
                        else if (name.includes("windows")) group = "Windows"
                        if (!groups[group]) groups[group] = []
                        groups[group].push(os)
                      })
                      
                      const osColors: Record<string, { bg: string, border: string, selected: string }> = {
                        "Ubuntu": { bg: "from-orange-500/20 to-orange-500/5", border: "border-orange-500/30", selected: "ring-orange-500/30" },
                        "Debian": { bg: "from-red-500/20 to-red-500/5", border: "border-red-500/30", selected: "ring-red-500/30" },
                        "CentOS": { bg: "from-purple-500/20 to-purple-500/5", border: "border-purple-500/30", selected: "ring-purple-500/30" },
                        "AlmaLinux": { bg: "from-blue-500/20 to-blue-500/5", border: "border-blue-500/30", selected: "ring-blue-500/30" },
                        "Rocky Linux": { bg: "from-emerald-500/20 to-emerald-500/5", border: "border-emerald-500/30", selected: "ring-emerald-500/30" },
                        "Windows": { bg: "from-cyan-500/20 to-cyan-500/5", border: "border-cyan-500/30", selected: "ring-cyan-500/30" },
                        "Другие": { bg: "from-gray-500/20 to-gray-500/5", border: "border-gray-500/30", selected: "ring-gray-500/30" }
                      }
                      
                      const groupOrder = ["Ubuntu", "Debian", "CentOS", "AlmaLinux", "Rocky Linux", "Windows", "Другие"]
                      const sortedGroups = groupOrder.filter(g => groups[g]?.length > 0)
                      
                      return sortedGroups.map(groupName => {
                        const versions = groups[groupName].sort((a, b) => b.name.localeCompare(a.name))
                        const isSelected = versions.some(v => v.vmManagerId === reinstallOs)
                        const selectedVersion = versions.find(v => v.vmManagerId === reinstallOs)
                        const logo = getOsLogo(groupName)
                        const colors = osColors[groupName] || osColors["Другие"]
                        const isOpen = openOsDropdown === groupName
                        
                        return (
                          <div 
                            key={groupName}
                            className={`relative rounded-xl border p-3 transition-all duration-200 ${
                              isSelected 
                                ? `bg-gradient-to-br ${colors.bg} ${colors.border} ring-2 ${colors.selected}` 
                                : `border-border/50 bg-card/30 hover:bg-card/50 hover:border-border`
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-2 right-2 size-5 rounded-full bg-foreground flex items-center justify-center">
                                <Check className="size-2.5 text-background" />
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2.5 mb-2.5">
                              <div className={`size-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-muted/50'}`}>
                                {logo ? <img src={logo} alt={groupName} className="size-6 object-contain" /> : <Monitor className="size-5 text-muted-foreground" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm text-foreground truncate">{groupName}</h4>
                                <p className="text-[10px] text-muted-foreground">{versions.length} {versions.length === 1 ? 'версия' : versions.length < 5 ? 'версии' : 'версий'}</p>
                              </div>
                            </div>
                            
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setOpenOsDropdown(isOpen ? null : groupName)}
                                className={`w-full flex items-center justify-between rounded-lg border px-2.5 py-2 text-xs font-medium transition-all ${
                                  isSelected 
                                    ? 'border-foreground/20 bg-background/60 text-foreground' 
                                    : 'border-border/50 bg-background/40 text-muted-foreground hover:text-foreground hover:border-border'
                                }`}
                              >
                                <span className="truncate">
                                  {selectedVersion 
                                    ? (selectedVersion.name.replace(/ubuntu|debian|centos|almalinux|rocky linux|windows/gi, '').trim() || selectedVersion.name)
                                    : 'Выбрать версию'}
                                </span>
                                <ChevronDown className={`size-3.5 shrink-0 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                              </button>
                              
                              {isOpen && (
                                <div className="absolute z-50 w-full mt-1 rounded-lg border border-border/50 bg-card shadow-lg overflow-hidden">
                                  <div className="max-h-32 overflow-y-auto">
                                    {versions.map(v => {
                                      const versionName = v.name.replace(/ubuntu|debian|centos|almalinux|rocky linux|windows/gi, '').trim() || v.name
                                      const isVersionSelected = v.vmManagerId === reinstallOs
                                      return (
                                        <button
                                          key={v.vmManagerId}
                                          type="button"
                                          onClick={() => {
                                            setReinstallOs(v.vmManagerId)
                                            setOpenOsDropdown(null)
                                          }}
                                          className={`w-full flex items-center justify-between px-2.5 py-2 text-xs transition-colors ${
                                            isVersionSelected 
                                              ? 'bg-foreground/10 text-foreground font-medium' 
                                              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                          }`}
                                        >
                                          <span>{versionName}</span>
                                          {isVersionSelected && <Check className="size-3 text-foreground" />}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/50 bg-card/30 px-3 py-2.5 text-sm text-muted-foreground">Нет доступных ОС</div>
                )}
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <Key className="size-4" />
                  Новый пароль root
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showReinstallPassword ? "text" : "password"}
                      value={reinstallPassword}
                      onChange={(e) => setReinstallPassword(e.target.value)}
                      placeholder="Минимум 8 символов"
                      disabled={isGeneratingReinstall}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowReinstallPassword(!showReinstallPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showReinstallPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={generateAnimatedReinstallPassword}
                    disabled={isGeneratingReinstall}
                    className={`size-10 shrink-0 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center transition-all duration-300 ${isGeneratingReinstall ? 'animate-spin' : 'hover:rotate-180'}`}
                    title="Сгенерировать пароль"
                  >
                    <Dices className="size-4" />
                  </button>
                </div>
                {reinstallPassword && (
                  <p className={`text-xs mt-1.5 transition-all duration-300 ${reinstallPassword.length >= 8 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {reinstallPassword.length >= 8 ? '✓ Пароль достаточно длинный' : `Ещё ${8 - reinstallPassword.length} символов`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeReinstallModal}
                className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-all duration-200"
              >
                Отмена
              </button>
              <button
                onClick={async () => {
                  if (reinstallOs && reinstallPassword.length >= 8 && onReinstallVds && reinstallModalVds) {
                    await onReinstallVds(reinstallModalVds.vmmanager6_host_id, reinstallOs, reinstallPassword)
                    closeReinstallModal()
                  }
                }}
                disabled={!reinstallOs || reinstallPassword.length < 8 || reinstallingVdsId === reinstallModalVds?.vmmanager6_host_id}
                className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-all duration-200 disabled:opacity-50"
              >
                {reinstallingVdsId === reinstallModalVds?.vmmanager6_host_id ? (
                  <Loader2 className="size-4 animate-spin mx-auto" />
                ) : (
                  'Переустановить'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Модальное окно настройки команды запуска */}
      {startupModalServer && (
        <StartupCommandModal
          serverId={startupModalServer.id}
          serverName={startupModalServer.name}
          currentPreset={startupModalServer.startupPreset}
          currentCommand={startupModalServer.startupCommand}
          onClose={() => setStartupModalServer(null)}
          onSuccess={() => {
            // Reload servers
            window.location.reload()
          }}
        />
      )}
    </>
  )
}

// VDS Card Component
interface VdsCardProps {
  vds: VdsServer
  isExpanded: boolean
  onToggle: () => void
  openingPanelId: number | null
  onOpenPanel: (hostId: number) => void
  onRenew?: (hostId: number) => Promise<void>
  renewingId?: number | null
  userBalance?: number
  onChangePassword?: () => void
  onReinstallClick?: () => void
  reinstallingId?: number | null
}

function VdsCard({ vds, isExpanded, onToggle, openingPanelId, onOpenPanel, onRenew, renewingId, userBalance, onChangePassword, onReinstallClick, reinstallingId }: VdsCardProps) {
  const [copied, setCopied] = useState(false)
  const [showIp, setShowIp] = useState(false)
  
  const statusConfig: Record<string, { color: string; label: string }> = {
    running: { color: 'emerald', label: 'Работает' },
    active: { color: 'emerald', label: 'Активен' },
    stopped: { color: 'red', label: 'Остановлен' },
    suspended: { color: 'amber', label: 'Приостановлен' },
    installing: { color: 'blue', label: 'Установка' },
    creating: { color: 'blue', label: 'Создание' },
    pending: { color: 'amber', label: 'Ожидание' },
  }
  
  const status = statusConfig[vds.status?.toLowerCase()] || { color: 'muted', label: vds.status || 'Неизвестно' }
  const osName = vds.osName || ''
  const osLogo = getOsLogo(osName)
  const isCreating = vds.status?.toLowerCase() === 'creating' || vds.status?.toLowerCase() === 'installing'
  const ipAddress = vds.ip_addresses?.[0] || vds.ip_address || (isCreating ? 'Назначается...' : '—')

  const copyIp = () => {
    if (ipAddress !== '—' && ipAddress !== 'Назначается...') {
      navigator.clipboard.writeText(ipAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
      isExpanded ? 'border-border bg-card/50' : 'border-border/50 bg-card/30 hover:border-border'
    }`}>
      <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={onToggle}>
        <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
          isExpanded ? 'bg-foreground' : 'bg-muted/40'
        }`}>
          {osLogo ? (
            <img src={osLogo} alt="" className="size-6" />
          ) : (
            <Cloud className={`size-5 transition-colors duration-300 ${isExpanded ? 'text-background' : 'text-muted-foreground'}`} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-0.5">
            <h3 className="font-heading font-bold text-foreground truncate">{vds.name}</h3>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            VDS • 
            <span 
              className={`font-mono cursor-pointer transition-all duration-300 ${showIp ? '' : 'blur-[4px] hover:blur-[2px]'}`}
              onClick={(e) => { e.stopPropagation(); setShowIp(!showIp) }}
              title={showIp ? 'Скрыть IP' : 'Показать IP'}
            >
              {ipAddress}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setShowIp(!showIp) }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {showIp ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {vds.vmmanager6_host_id && (
            <button 
              onClick={(e) => {
                e.stopPropagation()
                onOpenPanel(vds.vmmanager6_host_id)
              }}
              disabled={openingPanelId === vds.vmmanager6_host_id}
              className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors duration-200 disabled:opacity-50"
            >
              {openingPanelId === vds.vmmanager6_host_id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ExternalLink className="size-4" />
              )}
              Панель
            </button>
          )}
          <div className={`size-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
            isExpanded ? 'bg-muted/50 text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}>
            <ChevronDown className={`size-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      <div className={`border-t border-border/50 bg-muted/10 overflow-hidden transition-all duration-300 ${
        isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="p-5 grid gap-4 sm:grid-cols-3">
          {/* Сеть */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Сеть</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Globe className="size-3.5" />
                  IP адрес
                </span>
                <div className="flex items-center gap-2">
                  <span 
                    className={`text-foreground font-mono font-medium cursor-pointer transition-all duration-300 ${showIp ? '' : 'blur-[4px]'}`}
                    onClick={() => setShowIp(!showIp)}
                  >
                    {ipAddress}
                  </span>
                  <button
                    onClick={() => setShowIp(!showIp)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showIp ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                  {ipAddress !== '—' && ipAddress !== 'Назначается...' && showIp && (
                    <button
                      onClick={copyIp}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Скопировать"
                    >
                      {copied ? (
                        <Check className="size-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Система */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Система</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Activity className="size-3.5" />
                  Статус
                </span>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-${status.color}-500/10 text-${status.color}-500`}>
                  <span className={`size-1.5 rounded-full bg-${status.color}-500`}></span>
                  {status.label}
                </div>
              </div>
              {vds.expiresAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    Активен до
                  </span>
                  <span className="text-foreground font-medium">
                    {new Date(vds.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Monitor className="size-3.5" />
                  ОС
                </span>
                <span className="text-foreground font-medium flex items-center gap-1.5">
                  {osLogo && <img src={osLogo} alt="" className="size-4" />}
                  {osName || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <MemoryStick className="size-3.5" />
                  RAM
                </span>
                <span className="text-foreground font-medium">{vds.ram ? `${vds.ram} GB` : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Cpu className="size-3.5" />
                  CPU
                </span>
                <span className="text-foreground font-medium">{vds.cpu ? `${vds.cpu} ядер` : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <HardDrive className="size-3.5" />
                  Диск
                </span>
                <span className="text-foreground font-medium">{vds.disk ? `${vds.disk} GB` : '—'}</span>
              </div>
            </div>
          </div>

          {/* Действия */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Действия</p>
            <div className="space-y-2">
              {vds.vmmanager6_host_id && (
                <button 
                  onClick={() => onOpenPanel(vds.vmmanager6_host_id)}
                  disabled={openingPanelId === vds.vmmanager6_host_id}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors duration-200 disabled:opacity-50"
                >
                  {openingPanelId === vds.vmmanager6_host_id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ExternalLink className="size-4" />
                  )}
                  Открыть панель
                </button>
              )}
              {vds.vmmanager6_host_id && onRenew && vds.price !== undefined && (
                <>
                  <button 
                    onClick={() => onRenew(vds.vmmanager6_host_id)}
                    disabled={renewingId === vds.vmmanager6_host_id || (vds.price > 0 && userBalance !== undefined && userBalance < vds.price)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 py-2 text-sm font-medium text-emerald-500 hover:bg-emerald-500/20 transition-colors duration-200 disabled:opacity-50"
                  >
                    {renewingId === vds.vmmanager6_host_id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    Продлить {vds.price > 0 ? `(${vds.price} ₽)` : '(бесплатно)'}
                  </button>
                  {vds.price > 0 && userBalance !== undefined && userBalance < vds.price && (
                    <p className="text-xs text-amber-500 text-center">
                      Недостаточно средств
                    </p>
                  )}
                </>
              )}
              {/* Дата истечения убрана - теперь в секции Система */}
              {vds.vmmanager6_host_id && onReinstallClick && (
                <button 
                  onClick={onReinstallClick}
                  disabled={reinstallingId === vds.vmmanager6_host_id}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 py-2 text-sm font-medium text-amber-500 hover:bg-amber-500/20 transition-colors duration-200 disabled:opacity-50"
                >
                  {reinstallingId === vds.vmmanager6_host_id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Переустановить ОС
                </button>
              )}
              {vds.vmmanager6_host_id && onChangePassword && (
                <button 
                  onClick={onChangePassword}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 py-2 text-sm font-medium text-blue-500 hover:bg-blue-500/20 transition-colors duration-200"
                >
                  <Key className="size-4" />
                  Сменить пароль
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Server Card Component (Pterodactyl)
interface ServerCardProps {
  server: ServerData
  user: User
  isExpanded: boolean
  onToggle: () => void
  onDeleteClick: () => void
  onRenewServer?: (serverId: string) => Promise<void>
  isRenewing?: boolean
  isCoding?: boolean
  onStartupClick?: () => void
}

function ServerCard({ server, user, isExpanded, onToggle, onDeleteClick, onRenewServer, isRenewing, isCoding = false, onStartupClick }: ServerCardProps) {
  const statusConfig = {
    ACTIVE: { color: 'emerald', label: 'Онлайн' },
    INSTALLING: { color: 'amber', label: 'Установка' },
    SUSPENDED: { color: 'amber', label: 'Отключен' },
    OFF: { color: 'red', label: 'Выключен' },
    RESTARTING: { color: 'blue', label: 'Перезагружается' },
    DELETED: { color: 'gray', label: 'Удален' },
  }
  
  const status = statusConfig[server.status as keyof typeof statusConfig] || { color: 'muted', label: 'Ожидание' }

  return (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
      isExpanded ? 'border-border bg-card/50' : 'border-border/50 bg-card/30 hover:border-border'
    }`}>
      <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={onToggle}>
        <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
          isExpanded ? 'bg-foreground' : 'bg-muted/40'
        }`}>
          {isCoding ? (
            <Code className={`size-5 transition-colors duration-300 ${isExpanded ? 'text-background' : 'text-muted-foreground'}`} />
          ) : (
            <Server className={`size-5 transition-colors duration-300 ${isExpanded ? 'text-background' : 'text-muted-foreground'}`} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-0.5">
            <h3 className="font-heading font-bold text-foreground truncate">{server.name}</h3>
            <div className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-${status.color}-500/10 text-${status.color}-500`}>
              <span className={`size-1.5 rounded-full bg-${status.color}-500`}></span>
              {status.label}
            </div>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
            {server.plan.name}
            <span className="inline-flex items-center gap-0.5"><MemoryStick className="size-3" />{formatBytes(server.plan.ram)}</span>
            <span className="inline-flex items-center gap-0.5"><Cpu className="size-3" />{server.plan.cpu}%</span>
            <span className="inline-flex items-center gap-0.5"><HardDrive className="size-3" />{formatBytes(server.plan.disk)}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {server.pterodactylIdentifier ? (
            <a 
              href={`${process.env.NEXT_PUBLIC_PTERODACTYL_URL || 'https://control.yourdomain.ru'}/server/${server.pterodactylIdentifier}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors duration-200"
            >
              <ExternalLink className="size-4" />
              Панель
            </a>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
          )}
          <div className={`size-9 rounded-xl flex items-center justify-center transition-all ${
            isExpanded ? 'bg-muted/50 text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}>
            <ChevronDown className={`size-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      <div className={`border-t border-border/50 bg-muted/10 overflow-hidden transition-all duration-300 ${
        isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="p-5 grid gap-4 sm:grid-cols-4">
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ресурсы</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><MemoryStick className="size-3.5" />RAM</span>
                <span className="text-foreground font-medium">{formatBytes(server.plan.ram)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><Cpu className="size-3.5" />CPU</span>
                <span className="text-foreground font-medium">{server.plan.cpu}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><HardDrive className="size-3.5" />Диск</span>
                <span className="text-foreground font-medium">{formatBytes(server.plan.disk)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Тариф</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Server className="size-3.5" />
                  План
                </span>
                <span className="text-foreground font-medium">{server.plan.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Wallet className="size-3.5" />
                  Цена
                </span>
                <span className="text-foreground font-medium">{server.plan.price} ₽/мес</span>
              </div>
              {server.node && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Globe className="size-3.5" />
                    Локация
                  </span>
                  <span className="text-foreground font-medium flex items-center gap-1.5">
                    {server.node.countryCode && locationFlags[server.node.countryCode] && (
                      <img src={locationFlags[server.node.countryCode]} alt="" className="size-4 rounded-sm" />
                    )}
                    {server.node.locationName || server.node.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Время</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  Оплата
                </span>
                <span className="text-foreground font-medium">
                  {server.expiresAt 
                    ? new Date(server.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  Осталось
                </span>
                <span className="text-foreground font-medium">{formatTimeRemaining(server)}</span>
              </div>
              {calculateRefund(server) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <RefreshCw className="size-3.5" />
                    Возврат
                  </span>
                  <span className="text-emerald-500 font-medium">{calculateRefund(server)} ₽</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Действия</p>
            <div className="space-y-2">
              {server.pterodactylIdentifier && (
                <a 
                  href={`${process.env.NEXT_PUBLIC_PTERODACTYL_URL || 'https://control.yourdomain.ru'}/server/${server.pterodactylIdentifier}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors duration-200"
                >
                  <ExternalLink className="size-4" />
                  Открыть панель
                </a>
              )}
              
              {!isCoding && onStartupClick && (
                <button
                  onClick={onStartupClick}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 py-2 text-sm font-medium text-blue-500 hover:bg-blue-500/20 transition-colors duration-200"
                >
                  <Terminal className="size-4" />
                  Команда запуска
                </button>
              )}
              
              {!server.plan.isFree && onRenewServer && (
                <button
                  onClick={() => onRenewServer(server.id)}
                  disabled={isRenewing}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 py-2 text-sm font-medium text-emerald-500 hover:bg-emerald-500/20 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRenewing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Продлить ({server.plan.price + (server.node?.priceModifier ?? 0)} ₽)
                </button>
              )}
              {!server.plan.isFree && user.balance < (server.plan.price + (server.node?.priceModifier ?? 0)) && (
                <p className="text-xs text-amber-500 text-center">
                  Недостаточно средств для продления
                </p>
              )}
              <button
                onClick={onDeleteClick}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 py-2 text-sm font-medium text-red-500 hover:bg-red-500/20 transition-colors duration-200"
              >
                <Trash2 className="size-4" />
                Удалить сервер
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
