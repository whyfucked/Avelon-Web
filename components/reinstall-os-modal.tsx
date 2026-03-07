"use client"

import { useState, useEffect, useRef } from "react"
import { RefreshCw, Copy, Eye, EyeOff, Loader2, Monitor, ChevronDown, Check, Dices } from "lucide-react"
import { toast } from "sonner"

interface Service {
  id: string
  name: string
  status: string
  vmmanager6_host_id?: number // для VDS серверов
}

interface ReinstallOsModalProps {
  service: Service | null
  isOpen: boolean
  onClose: () => void
  onReinstall?: () => void
  serviceType?: 'dedicated' | 'vds' // тип сервиса
  osImages?: Array<{ id: number; name: string }> // для VDS серверов
}

// OS Images для дедиков Hetzner (статический список)
const dedicatedOsImages = [
  // Ubuntu
  { id: 1, name: "Ubuntu 24.04 LTS" },
  { id: 2, name: "Ubuntu 22.04 LTS" },
  { id: 3, name: "Ubuntu 20.04 LTS" },
  // Debian
  { id: 4, name: "Debian 12" },
  { id: 5, name: "Debian 11" },
  { id: 6, name: "Debian 10" },
  // CentOS / AlmaLinux / Rocky
  { id: 7, name: "AlmaLinux 9" },
  { id: 8, name: "AlmaLinux 8" },
  { id: 9, name: "Rocky Linux 9" },
  { id: 10, name: "Rocky Linux 8" },
  { id: 11, name: "CentOS Stream 9" },
  { id: 12, name: "CentOS Stream 8" },
  // Fedora
  { id: 13, name: "Fedora 39" },
  { id: 14, name: "Fedora 38" },
  // Arch
  { id: 15, name: "Arch Linux" },
]

export function ReinstallOsModal({ service, isOpen, onClose, onReinstall, serviceType = 'dedicated', osImages }: ReinstallOsModalProps) {
  const [reinstallOs, setReinstallOs] = useState<number | null>(null)
  const [reinstallPassword, setReinstallPassword] = useState('')
  const [showReinstallPassword, setShowReinstallPassword] = useState(false)
  const [isGeneratingReinstall, setIsGeneratingReinstall] = useState(false)
  const [isClosingModal, setIsClosingModal] = useState(false)
  const [sendingReinstall, setSendingReinstall] = useState(false)
  const [openOsDropdown, setOpenOsDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close OS dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as HTMLElement)) {
        setOpenOsDropdown(null)
      }
    }
    if (openOsDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openOsDropdown])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setReinstallOs(null)
      setReinstallPassword('')
      setShowReinstallPassword(false)
      setOpenOsDropdown(null)
      setIsClosingModal(false)
    }
  }, [isOpen])

  const closeModal = () => {
    setIsClosingModal(true)
    setTimeout(() => {
      onClose()
      setIsClosingModal(false)
    }, 200)
  }

  // Генерация пароля для переустановки
  const generateAnimatedPassword = () => {
    setIsGeneratingReinstall(true)
    setReinstallPassword('')
    
    const generatePassword = (length: number = 16): string => {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
      let password = "aA1!"
      for (let i = 4; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return password.split('').sort(() => Math.random() - 0.5).join('')
    }
    
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
  }

  const getOsLogo = (osName: string): string | null => {
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
    const nameLower = osName.toLowerCase()
    for (const [key, url] of Object.entries(osLogos)) {
      if (nameLower.includes(key)) return url
    }
    return null
  }

  const handleReinstall = async () => {
    if (!service || !reinstallOs || !reinstallPassword || reinstallPassword.length < 8 || sendingReinstall) return
    
    setSendingReinstall(true)
    try {
      let res: Response
      
      if (serviceType === 'vds') {
        // Для VDS серверов
        res = await fetch(`/api/user/vds/${service.id}/reinstall`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            osId: reinstallOs,
            password: reinstallPassword
          })
        })
      } else {
        // Для Dedicated серверов
        const selectedOs = dedicatedOsImages.find(os => os.id === reinstallOs)
        res = await fetch('/api/admin/dedicated/reinstall', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            serverId: service.id, 
            serverName: service.name,
            os: selectedOs?.name || 'Неизвестная ОС',
            password: reinstallPassword
          })
        })
      }
      
      if (res.ok) {
        toast.success('Запрос отправлен! Администратор свяжется с вами.')
        closeModal()
        if (onReinstall) onReinstall()
      } else {
        toast.error('Ошибка отправки запроса')
      }
    } catch (error) {
      console.error('[Reinstall]', error)
      toast.error('Ошибка отправки запроса')
    } finally {
      setSendingReinstall(false)
    }
  }

  if (!isOpen || !service) return null

  const overlayAnimation = isClosingModal ? 'animate-out fade-out duration-200' : 'animate-in fade-in duration-200'
  const panelAnimation = isClosingModal 
    ? 'animate-out fade-out zoom-out-95 slide-out-to-top-2 duration-200' 
    : 'animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200'

  return (
    <div 
      className={`fixed inset-0 z-[9999] px-4 py-10 sm:py-14 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm ${overlayAnimation}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeModal()
        }
      }}
    >
      <div 
        className={`w-full max-w-6xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden ${panelAnimation}`}
        onClick={(e) => e.stopPropagation()}
      >
      <div className="flex items-center justify-between p-8 mb-6 border-b border-border/50 bg-background/60">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <RefreshCw className="size-8 text-amber-500" />
          </div>
          <div>
            <h1 className="font-heading text-4xl font-bold text-foreground">Переустановка ОС</h1>
            <p className="text-lg text-muted-foreground mt-1">Сервер: {service.name}</p>
          </div>
        </div>
        <button
          onClick={closeModal}
          disabled={sendingReinstall}
          className="size-12 sm:size-14 rounded-2xl hover:bg-muted/50 flex items-center justify-center transition-colors disabled:opacity-50"
        >
          <span className="text-3xl sm:text-4xl text-muted-foreground">×</span>
        </button>
      </div>
      
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl mx-8 px-6 py-5 sm:px-8 sm:py-6 mb-8">
        <p className="text-lg text-amber-200 font-medium">
          ⚠️ Все данные на сервере будут удалены. Это действие необратимо.
        </p>
      </div>
      
      <div className="px-8 pb-8 space-y-10 max-h-[calc(100vh-200px)] overflow-y-auto">
        <div>
          <label className="flex items-center gap-3 text-2xl font-bold text-foreground mb-6">
            <Monitor className="size-8" />
            Операционная система
          </label>
          <div ref={dropdownRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {(() => {
              // Используем переданные osImages для VDS или статический список для Dedicated
              const availableImages = serviceType === 'vds' && osImages ? osImages : dedicatedOsImages
              
              if (serviceType === 'vds' && osImages) {
                // Простой список для VDS
                return availableImages.map(os => (
                  <div 
                    key={os.id}
                    className={`relative rounded-2xl border p-6 transition-all duration-200 cursor-pointer ${
                      reinstallOs === os.id
                        ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/30 ring-4 ring-blue-500/30' 
                        : 'border-border/50 bg-card/30 hover:bg-card/50 hover:border-border'
                    }`}
                    onClick={() => setReinstallOs(os.id)}
                  >
                    {reinstallOs === os.id && (
                      <div className="absolute top-4 right-4 size-8 rounded-full bg-foreground flex items-center justify-center">
                        <Check className="size-4 text-background" />
                      </div>
                    )}
                    
                    <div className="flex flex-col items-center gap-4">
                      <div className={`size-16 rounded-2xl flex items-center justify-center ${reinstallOs === os.id ? 'bg-white/20' : 'bg-muted/50'}`}>
                        <Monitor className="size-8 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <h4 className="font-semibold text-lg text-foreground">{os.name}</h4>
                      </div>
                    </div>
                  </div>
                ))
              }
              
              // Группированный список для Dedicated серверов
              const groups: Record<string, typeof dedicatedOsImages> = {}
              dedicatedOsImages.forEach(os => {
                const name = os.name.toLowerCase()
                let group = "Другие"
                if (name.includes("ubuntu")) group = "Ubuntu"
                else if (name.includes("debian")) group = "Debian"
                else if (name.includes("centos") || name.includes("alma") || name.includes("rocky")) group = "RHEL"
                else if (name.includes("fedora")) group = "Fedora"
                else if (name.includes("arch")) group = "Arch"
                if (!groups[group]) groups[group] = []
                groups[group].push(os)
              })
              
              const osColors: Record<string, { bg: string, border: string, selected: string }> = {
                "Ubuntu": { bg: "from-orange-500/20 to-orange-500/5", border: "border-orange-500/30", selected: "ring-orange-500/30" },
                "Debian": { bg: "from-red-500/20 to-red-500/5", border: "border-red-500/30", selected: "ring-red-500/30" },
                "RHEL": { bg: "from-blue-500/20 to-blue-500/5", border: "border-blue-500/30", selected: "ring-blue-500/30" },
                "Fedora": { bg: "from-purple-500/20 to-purple-500/5", border: "border-purple-500/30", selected: "ring-purple-500/30" },
                "Arch": { bg: "from-cyan-500/20 to-cyan-500/5", border: "border-cyan-500/30", selected: "ring-cyan-500/30" },
                "Другие": { bg: "from-gray-500/20 to-gray-500/5", border: "border-gray-500/30", selected: "ring-gray-500/30" }
              }
              
              const groupOrder = ["Ubuntu", "Debian", "RHEL", "Fedora", "Arch", "Другие"]
              const sortedGroups = groupOrder.filter(g => groups[g]?.length > 0)
              
              return sortedGroups.map(groupName => {
                const versions = groups[groupName]
                const isSelected = versions.some(v => v.id === reinstallOs)
                const selectedVersion = versions.find(v => v.id === reinstallOs)
                const logo = getOsLogo(groupName)
                const colors = osColors[groupName] || osColors["Другие"]
                const isOpen = openOsDropdown === groupName
                
                return (
                  <div 
                    key={groupName}
                    className={`relative rounded-2xl border p-6 transition-all duration-200 ${
                      isSelected 
                        ? `bg-gradient-to-br ${colors.bg} ${colors.border} ring-4 ${colors.selected}` 
                        : `border-border/50 bg-card/30 hover:bg-card/50 hover:border-border`
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-4 right-4 size-8 rounded-full bg-foreground flex items-center justify-center">
                        <Check className="size-4 text-background" />
                      </div>
                    )}
                    
                    <div className="flex flex-col items-center gap-4 mb-4">
                      <div className={`size-16 rounded-2xl flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-muted/50'}`}>
                        {logo ? <img src={logo} alt={groupName} className="size-10 object-contain" /> : <Monitor className="size-8 text-muted-foreground" />}
                      </div>
                      <div className="text-center">
                        <h4 className="font-semibold text-xl text-foreground">{groupName}</h4>
                        <p className="text-sm text-muted-foreground">{versions.length} {versions.length === 1 ? 'версия' : versions.length < 5 ? 'версии' : 'версий'}</p>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenOsDropdown(isOpen ? null : groupName)}
                        className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-base font-medium transition-all ${
                          isSelected 
                            ? 'border-foreground/20 bg-background/60 text-foreground' 
                            : 'border-border/50 bg-background/40 text-muted-foreground hover:text-foreground hover:border-border'
                        }`}
                      >
                        <span className="truncate">
                          {selectedVersion ? selectedVersion.name : 'Выбрать версию'}
                        </span>
                        <ChevronDown className={`size-5 shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isOpen && (
                        <div className="absolute z-50 w-full mt-2 rounded-xl border border-border/50 bg-card shadow-xl overflow-hidden">
                          <div className="max-h-64 overflow-y-auto">
                            {versions.map(v => {
                              const isVersionSelected = v.id === reinstallOs
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => {
                                    setReinstallOs(v.id)
                                    setOpenOsDropdown(null)
                                  }}
                                  className={`w-full flex items-center justify-between px-4 py-3 text-base transition-colors ${
                                    isVersionSelected 
                                      ? 'bg-foreground/10 text-foreground font-medium' 
                                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                  }`}
                                >
                                  <span>{v.name}</span>
                                  {isVersionSelected && <Check className="size-5 text-foreground" />}
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
        </div>
        
        <div>
          <label className="flex items-center gap-3 text-2xl font-bold text-foreground mb-6">
            <Copy className="size-8" />
            Новый пароль root
          </label>
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            <div className="relative flex-1">
              <input
                type={showReinstallPassword ? "text" : "password"}
                value={reinstallPassword}
                onChange={(e) => setReinstallPassword(e.target.value)}
                placeholder="Минимум 8 символов"
                disabled={isGeneratingReinstall}
                className="w-full rounded-2xl border border-border bg-background px-6 py-4 pr-16 text-xl text-foreground font-mono transition-all"
              />
              <button
                type="button"
                onClick={() => setShowReinstallPassword(!showReinstallPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showReinstallPassword ? <EyeOff className="size-6" /> : <Eye className="size-6" />}
              </button>
            </div>
            <div className="flex items-center gap-3 lg:gap-4">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(reinstallPassword).then(() => toast.success('Скопировано!'))}
                disabled={!reinstallPassword}
                className="size-16 shrink-0 rounded-2xl border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center transition-all disabled:opacity-50"
                title="Скопировать"
              >
                <Copy className="size-6" />
              </button>
              <button
                type="button"
                onClick={generateAnimatedPassword}
                disabled={isGeneratingReinstall}
                className={`size-16 shrink-0 rounded-2xl border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center transition-all duration-300 ${isGeneratingReinstall ? 'animate-spin' : 'hover:rotate-180'}`}
                title="Сгенерировать пароль"
              >
                <Dices className="size-6" />
              </button>
            </div>
          </div>
          {reinstallPassword && (
            <p className={`text-lg mt-4 transition-all duration-300 ${reinstallPassword.length >= 8 ? 'text-emerald-500' : 'text-amber-500'}`}>
              {reinstallPassword.length >= 8 ? '✓ Пароль достаточно длинный' : `Ещё ${8 - reinstallPassword.length} символов`}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 px-8 pb-8">
        <button
          onClick={closeModal}
          disabled={sendingReinstall}
          className="flex-1 rounded-2xl border border-border py-4 text-xl font-medium text-foreground hover:bg-muted/50 transition-all duration-200 disabled:opacity-50"
        >
          Отмена
        </button>
        <button
          onClick={handleReinstall}
          disabled={!reinstallOs || reinstallPassword.length < 8 || sendingReinstall}
          className="flex-1 rounded-2xl bg-amber-500 py-4 text-xl font-medium text-white hover:bg-amber-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sendingReinstall ? (
            <Loader2 className="size-6 animate-spin mx-auto" />
          ) : (
            'Переустановить'
          )}
        </button>
      </div>
      </div>
    </div>
  )
}
