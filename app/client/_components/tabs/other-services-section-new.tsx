"use client"

import { useState, useEffect } from "react"
import { Server, Globe, HardDrive, Calendar, Wallet, RefreshCw, Copy, Eye, EyeOff, Loader2, Box, ChevronDown, Check, MemoryStick, Cpu } from "lucide-react"
import { toast } from "sonner"
import { ReinstallOsModal } from "@/components/reinstall-os-modal"

interface Service {
  id: string
  name: string
  status: string
  expiresAt: string | null
  gracePeriodEnd: string | null
  createdAt: string
  paidAmount: number | null
  ipAddress?: string
  rootPassword?: string
  specs?: string
  ftpHost?: string
  ftpUser?: string
  ftpPassword?: string
  sizeGB?: number
  registrar?: string
}

interface OtherServicesSectionProps {
  userBalance: number
  onBalanceUpdate: () => void
  onServicesLoaded?: (count: number) => void
}

const statusConfig: Record<string, { color: string; label: string }> = {
  UNPAID: { color: 'red', label: 'Не оплачен' },
  INSTALLING: { color: 'blue', label: 'Установка' },
  READY: { color: 'cyan', label: 'Готов' },
  ACTIVE: { color: 'emerald', label: 'Активен' },
  SUSPENDED: { color: 'red', label: 'Приостановлен' },
  GRACE_PERIOD: { color: 'amber', label: 'Grace Period' },
  PENDING: { color: 'amber', label: 'Ожидание' },
}

export function OtherServicesSection({ userBalance, onBalanceUpdate, onServicesLoaded }: OtherServicesSectionProps) {
  const [services, setServices] = useState<{
    dedicated: Service[]
    domains: Service[]
    storageBoxes: Service[]
  }>({
    dedicated: [],
    domains: [],
    storageBoxes: [],
  })
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [showIps, setShowIps] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<Record<string, boolean>>({})
  const [payingId, setPayingId] = useState<string | null>(null)
  const [renewingId, setRenewingId] = useState<string | null>(null)
  
  // Reinstall modal state
  const [reinstallModalService, setReinstallModalService] = useState<Service | null>(null)

  useEffect(() => {
    loadServices()
  }, [])

  const loadServices = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/user/services')
      if (r.ok) {
        const data = await r.json()
        const newServices = {
          dedicated: data.dedicated || [],
          domains: data.domains || [],
          storageBoxes: data.storageBoxes || [],
        }
        setServices(newServices)
        
        // Уведомляем родителя о количестве сервисов
        const total = newServices.dedicated.length + newServices.domains.length + newServices.storageBoxes.length
        if (onServicesLoaded) {
          onServicesLoaded(total)
        }
      }
    } catch (error) {
      console.error('[Services Load]', error)
    }
    setLoading(false)
  }

  const payService = async (serviceId: string, serviceType: string, months: number = 1) => {
    setPayingId(serviceId)
    try {
      const r = await fetch('/api/user/services/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, serviceType, months }),
      })

      const data = await r.json()

      if (r.ok) {
        toast.success(`Оплачено! Статус: Установка`)
        loadServices()
        onBalanceUpdate()
      } else {
        if (data.error === 'Insufficient balance') {
          toast.error(`Недостаточно средств. Нужно: ${data.required} ₽, доступно: ${data.current} ₽`)
        } else {
          toast.error(data.error || 'Ошибка оплаты')
        }
      }
    } catch {
      toast.error('Ошибка оплаты')
    }
    setPayingId(null)
  }

  const renewService = async (serviceId: string, serviceType: string, months: number = 1) => {
    setRenewingId(serviceId)
    try {
      const r = await fetch('/api/user/services/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, serviceType, months }),
      })

      const data = await r.json()

      if (r.ok) {
        toast.success('Продлено!')
        loadServices()
        onBalanceUpdate()
      } else {
        if (data.error === 'Insufficient balance') {
          toast.error(`Недостаточно средств. Нужно: ${data.required} ₽, доступно: ${data.current} ₽`)
        } else {
          toast.error(data.error || 'Ошибка продления')
        }
      }
    } catch {
      toast.error('Ошибка продления')
    }
    setRenewingId(null)
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied({ ...copied, [id]: true })
    setTimeout(() => setCopied({ ...copied, [id]: false }), 2000)
  }

  const totalServices = services.dedicated.length + services.domains.length + services.storageBoxes.length

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Server className="size-4" />
          <span>Загрузка других сервисов...</span>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (totalServices === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Dedicated серверы */}
      {services.dedicated.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Server className="size-4" />
            <span>Dedicated серверы ({services.dedicated.length})</span>
          </div>
          {services.dedicated.map((service) => {
            const isExpanded = expandedId === service.id
            const specs = service.specs ? JSON.parse(service.specs) : null
            const status = statusConfig[service.status] || { color: 'muted', label: service.status }
            const showIp = showIps[service.id] || false
            const showPass = showPasswords[service.id] || false
            
            return (
              <div key={service.id} className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                isExpanded ? 'border-border bg-card/50' : 'border-border/50 bg-card/30 hover:border-border'
              }`}>
                <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : service.id)}>
                  <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isExpanded ? 'bg-foreground' : 'bg-muted/40'
                  }`}>
                    <Server className={`size-5 transition-colors duration-300 ${isExpanded ? 'text-background' : 'text-muted-foreground'}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-0.5">
                      <h3 className="font-heading font-bold text-foreground truncate">{service.name}</h3>
                      <div className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-${status.color}-500/10 text-${status.color}-500`}>
                        <span className={`size-1.5 rounded-full bg-${status.color}-500`}></span>
                        {status.label}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      Dedicated
                      {specs && (
                        <>
                          {specs.ram && <span className="inline-flex items-center gap-0.5"><MemoryStick className="size-3" />{specs.ram}GB</span>}
                          {specs.cpu && <span className="inline-flex items-center gap-0.5"><Cpu className="size-3" />{specs.cpu}</span>}
                          {specs.disk && <span className="inline-flex items-center gap-0.5"><HardDrive className="size-3" />{specs.disk}GB</span>}
                        </>
                      )}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
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
                    {/* Ресурсы */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ресурсы</p>
                      <div className="space-y-2">
                        {specs?.ram && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5"><MemoryStick className="size-3.5" />RAM</span>
                            <span className="text-foreground font-medium">{specs.ram} GB</span>
                          </div>
                        )}
                        {specs?.cpu && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5"><Cpu className="size-3.5" />CPU</span>
                            <span className="text-foreground font-medium">{specs.cpu}</span>
                          </div>
                        )}
                        {specs?.disk && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5"><HardDrive className="size-3.5" />Диск</span>
                            <span className="text-foreground font-medium">{specs.disk} GB</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Доступ */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Доступ</p>
                      <div className="space-y-2">
                        {service.ipAddress && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5"><Globe className="size-3.5" />IP адрес</span>
                            <div className="flex items-center gap-1">
                              <span className="text-foreground font-medium font-mono text-xs">{service.ipAddress}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(service.ipAddress!, service.id + '_ip') }}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {copied[service.id + '_ip'] ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}
                        {service.rootPassword && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5"><Copy className="size-3.5" />Пароль</span>
                            <div className="flex items-center gap-1">
                              <span className="text-foreground font-medium font-mono text-xs">
                                {showPass ? service.rootPassword : '••••••••'}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setShowPasswords({...showPasswords, [service.id]: !showPass}) }}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {showPass ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                              </button>
                              {showPass && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyToClipboard(service.rootPassword!, service.id + '_pass') }}
                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {copied[service.id + '_pass'] ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Время */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Время</p>
                      <div className="space-y-2">
                        {service.expiresAt && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="size-3.5" />Оплата</span>
                            <span className="text-foreground font-medium">
                              {new Date(service.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        )}
                        {service.paidAmount && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5"><Wallet className="size-3.5" />Цена</span>
                            <span className="text-foreground font-medium">{service.paidAmount} ₽/мес</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Действия */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Действия</p>
                      <div className="space-y-2">
                        {service.status === 'UNPAID' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); payService(service.id, 'dedicated') }}
                            disabled={payingId === service.id}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors duration-200 disabled:opacity-50"
                          >
                            {payingId === service.id ? <Loader2 className="size-4 animate-spin" /> : `Оплатить ${service.paidAmount || 0} ₽`}
                          </button>
                        )}
                        {service.status === 'ACTIVE' && service.paidAmount && (
                          <button
                            onClick={(e) => { e.stopPropagation(); renewService(service.id, 'dedicated') }}
                            disabled={renewingId === service.id}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 py-2 text-sm font-medium text-emerald-500 hover:bg-emerald-500/20 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {renewingId === service.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <RefreshCw className="size-4" />
                            )}
                            Продлить ({service.paidAmount} ₽)
                          </button>
                        )}
                        {service.status === 'ACTIVE' && service.paidAmount && userBalance < service.paidAmount && (
                          <p className="text-xs text-amber-500 text-center">
                            Недостаточно средств для продления
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Домены */}
      {services.domains.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="size-4" />
            <span>Домены ({services.domains.length})</span>
          </div>
          {services.domains.map((service) => {
            const isExpanded = expandedId === service.id
            const status = statusConfig[service.status] || { color: 'muted', label: service.status }
            
            return (
              <div key={service.id} className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                isExpanded ? 'border-border bg-card/50' : 'border-border/50 bg-card/30 hover:border-border'
              }`}>
                <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : service.id)}>
                  <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isExpanded ? 'bg-foreground' : 'bg-muted/40'
                  }`}>
                    <Globe className={`size-5 transition-colors duration-300 ${isExpanded ? 'text-background' : 'text-muted-foreground'}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-0.5">
                      <h3 className="font-heading font-bold text-foreground truncate">{service.name}</h3>
                      <div className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-${status.color}-500/10 text-${status.color}-500`}>
                        <span className={`size-1.5 rounded-full bg-${status.color}-500`}></span>
                        {status.label}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      Домен
                      {service.registrar && <span>• {service.registrar}</span>}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
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
                    {/* Информация */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Информация</p>
                      <div className="space-y-2">
                        {service.registrar && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5"><Globe className="size-3.5" />Регистратор</span>
                            <span className="text-foreground font-medium">{service.registrar}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5"><Server className="size-3.5" />Домен</span>
                          <span className="text-foreground font-medium">{service.name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Пусто */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">—</p>
                    </div>

                    {/* Время */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Время</p>
                      <div className="space-y-2">
                        {service.expiresAt && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="size-3.5" />Оплата</span>
                            <span className="text-foreground font-medium">
                              {new Date(service.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        )}
                        {service.paidAmount && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5"><Wallet className="size-3.5" />Цена</span>
                            <span className="text-foreground font-medium">{service.paidAmount} ₽/мес</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Действия */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Действия</p>
                      <div className="space-y-2">
                        {service.status === 'UNPAID' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); payService(service.id, 'domain') }}
                            disabled={payingId === service.id}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors duration-200 disabled:opacity-50"
                          >
                            {payingId === service.id ? <Loader2 className="size-4 animate-spin" /> : `Оплатить ${service.paidAmount || 0} ₽`}
                          </button>
                        )}
                        {service.status === 'ACTIVE' && service.paidAmount && (
                          <button
                            onClick={(e) => { e.stopPropagation(); renewService(service.id, 'domain') }}
                            disabled={renewingId === service.id}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 py-2 text-sm font-medium text-emerald-500 hover:bg-emerald-500/20 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {renewingId === service.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <RefreshCw className="size-4" />
                            )}
                            Продлить ({service.paidAmount} ₽)
                          </button>
                        )}
                        {service.status === 'ACTIVE' && service.paidAmount && userBalance < service.paidAmount && (
                          <p className="text-xs text-amber-500 text-center">
                            Недостаточно средств для продления
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* StorageBox */}
      {services.storageBoxes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Box className="size-4" />
            <span>StorageBox ({services.storageBoxes.length})</span>
          </div>
          {services.storageBoxes.map((service) => {
            const isExpanded = expandedId === service.id
            const status = statusConfig[service.status] || { color: 'muted', label: service.status }
            const showPass = showPasswords[service.id] || false
            
            return (
              <div key={service.id} className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                isExpanded ? 'border-border bg-card/50' : 'border-border/50 bg-card/30 hover:border-border'
              }`}>
                <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : service.id)}>
                  <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isExpanded ? 'bg-foreground' : 'bg-muted/40'
                  }`}>
                    <Box className={`size-5 transition-colors duration-300 ${isExpanded ? 'text-background' : 'text-muted-foreground'}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-0.5">
                      <h3 className="font-heading font-bold text-foreground truncate">{service.name}</h3>
                      <div className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-${status.color}-500/10 text-${status.color}-500`}>
                        <span className={`size-1.5 rounded-full bg-${status.color}-500`}></span>
                        {status.label}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      StorageBox
                      {service.sizeGB && <span className="inline-flex items-center gap-0.5"><HardDrive className="size-3" />{service.sizeGB}GB</span>}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
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
                    {/* Ресурсы */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ресурсы</p>
                      <div className="space-y-2">
                        {service.sizeGB && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5"><HardDrive className="size-3.5" />Размер</span>
                            <span className="text-foreground font-medium">{service.sizeGB} GB</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Доступ */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Доступ</p>
                      <div className="space-y-2">
                        {service.ftpHost && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5"><Globe className="size-3.5" />FTP Host</span>
                            <div className="flex items-center gap-1">
                              <span className="text-foreground font-medium font-mono text-xs">{service.ftpHost}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(service.ftpHost!, service.id + '_host') }}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {copied[service.id + '_host'] ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}
                        {service.ftpUser && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5"><Copy className="size-3.5" />FTP User</span>
                            <div className="flex items-center gap-1">
                              <span className="text-foreground font-medium font-mono text-xs">{service.ftpUser}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(service.ftpUser!, service.id + '_user') }}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {copied[service.id + '_user'] ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}
                        {service.ftpPassword && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5"><Copy className="size-3.5" />FTP Pass</span>
                            <div className="flex items-center gap-1">
                              <span className="text-foreground font-medium font-mono text-xs">
                                {showPass ? service.ftpPassword : '••••••••'}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setShowPasswords({...showPasswords, [service.id]: !showPass}) }}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {showPass ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                              </button>
                              {showPass && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyToClipboard(service.ftpPassword!, service.id + '_pass') }}
                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {copied[service.id + '_pass'] ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Время */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Время</p>
                      <div className="space-y-2">
                        {service.expiresAt && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="size-3.5" />Оплата</span>
                            <span className="text-foreground font-medium">
                              {new Date(service.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        )}
                        {service.paidAmount && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5"><Wallet className="size-3.5" />Цена</span>
                            <span className="text-foreground font-medium">{service.paidAmount} ₽/мес</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Действия */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Действия</p>
                      <div className="space-y-2">
                        {service.status === 'UNPAID' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); payService(service.id, 'storagebox') }}
                            disabled={payingId === service.id}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors duration-200 disabled:opacity-50"
                          >
                            {payingId === service.id ? <Loader2 className="size-4 animate-spin" /> : `Оплатить ${service.paidAmount || 0} ₽`}
                          </button>
                        )}
                        {service.status === 'ACTIVE' && service.paidAmount && (
                          <button
                            onClick={(e) => { e.stopPropagation(); renewService(service.id, 'storagebox') }}
                            disabled={renewingId === service.id}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 py-2 text-sm font-medium text-emerald-500 hover:bg-emerald-500/20 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {renewingId === service.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <RefreshCw className="size-4" />
                            )}
                            Продлить ({service.paidAmount} ₽)
                          </button>
                        )}
                        {service.status === 'ACTIVE' && service.paidAmount && userBalance < service.paidAmount && (
                          <p className="text-xs text-amber-500 text-center">
                            Недостаточно средств для продления
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {/* Модальное окно переустановки ОС */}
      <ReinstallOsModal
        service={reinstallModalService}
        isOpen={!!reinstallModalService}
        onClose={() => setReinstallModalService(null)}
        onReinstall={loadServices}
      />
    </div>
  )
}