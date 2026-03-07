"use client"

import { useState } from "react"
import { Server, Globe, HardDrive, Calendar, Wallet, RefreshCw, AlertCircle, CheckCircle, Copy, Eye, EyeOff } from "lucide-react"
import { notify } from "@/lib/notify"

interface Service {
  id: string
  name: string
  status: string
  expiresAt: string | null
  gracePeriodEnd: string | null
  createdAt: string
  plan: { id: string; name: string; price: number }
  ipAddress?: string
  rootPassword?: string
  ftpHost?: string
  ftpUser?: string
  ftpPassword?: string
  sizeGB?: number
  registrar?: string
}

interface ServicesTabProps {
  userBalance: number
  onLoadBalance: () => void
}

export function ServicesTab({ userBalance, onLoadBalance }: ServicesTabProps) {
  const [activeCategory, setActiveCategory] = useState<'dedicated' | 'domains' | 'storagebox'>('dedicated')
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
  const [renewingId, setRenewingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})

  const loadServices = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/user/services')
      if (r.ok) {
        const data = await r.json()
        setServices({
          dedicated: data.dedicated || [],
          domains: data.domains || [],
          storageBoxes: data.storageBoxes || [],
        })
      }
    } catch (error) {
      notify.error('Ошибка загрузки сервисов')
    }
    setLoading(false)
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
        notify.success(`Сервис продлён до ${new Date(data.newExpiry).toLocaleDateString('ru-RU')}`)
        loadServices()
        onLoadBalance()
      } else {
        if (data.error === 'Insufficient balance') {
          notify.error(`Недостаточно средств. Нужно: ${data.required} ₽, доступно: ${data.current} ₽`)
        } else {
          notify.error(data.error || 'Ошибка продления')
        }
      }
    } catch {
      notify.error('Ошибка продления')
    }
    setRenewingId(null)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    notify.success(`${label} скопирован`)
  }

  const togglePassword = (serviceId: string) => {
    setShowPasswords(prev => ({ ...prev, [serviceId]: !prev[serviceId] }))
  }

  const categories = [
    { id: 'dedicated' as const, label: 'Дедики', icon: Server, count: services.dedicated.length },
    { id: 'domains' as const, label: 'Домены', icon: Globe, count: services.domains.length },
    { id: 'storagebox' as const, label: 'StorageBox', icon: HardDrive, count: services.storageBoxes.length },
  ]

  const currentServices = services[activeCategory === 'dedicated' ? 'dedicated' : activeCategory === 'domains' ? 'domains' : 'storageBoxes']

  const statusColors: Record<string, string> = {
    PENDING: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
    ACTIVE: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
    SUSPENDED: 'bg-red-500/20 text-red-500 border-red-500/30',
    GRACE_PERIOD: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  }

  const statusLabels: Record<string, string> = {
    PENDING: 'Ожидание',
    ACTIVE: 'Активен',
    SUSPENDED: 'Приостановлен',
    GRACE_PERIOD: 'Grace Period',
  }

  const getDaysRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Мои сервисы</h1>
          <p className="text-sm text-muted-foreground">
            Всего: {services.dedicated.length + services.domains.length + services.storageBoxes.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border">
            <Wallet className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{userBalance.toFixed(2)} ₽</span>
          </div>
          <button
            onClick={loadServices}
            disabled={loading}
            className="size-9 rounded-xl bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2">
        {categories.map((cat) => {
          const Icon = cat.icon
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-foreground text-background'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <Icon className="size-4" />
              <span>{cat.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeCategory === cat.id ? 'bg-background/20' : 'bg-accent'
              }`}>
                {cat.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Services List */}
      <div className="space-y-3">
        {currentServices.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="size-12 animate-spin text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Загрузка...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                {activeCategory === 'dedicated' && <Server className="size-12 text-muted-foreground opacity-50" />}
                {activeCategory === 'domains' && <Globe className="size-12 text-muted-foreground opacity-50" />}
                {activeCategory === 'storagebox' && <HardDrive className="size-12 text-muted-foreground opacity-50" />}
                <div>
                  <p className="text-foreground font-medium mb-1">Нет сервисов</p>
                  <p className="text-sm text-muted-foreground">
                    Обратитесь к администратору для создания сервиса
                  </p>
                </div>
                <button
                  onClick={loadServices}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Обновить список
                </button>
              </div>
            )}
          </div>
        ) : (
          currentServices.map((service) => {
            const daysRemaining = getDaysRemaining(service.expiresAt)
            const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7
            const isExpired = daysRemaining !== null && daysRemaining <= 0
            const isExpanded = expandedId === service.id

            return (
              <div
                key={service.id}
                className={`rounded-2xl border bg-card transition-all ${
                  service.status === 'GRACE_PERIOD' ? 'border-orange-500/50' :
                  service.status === 'SUSPENDED' ? 'border-red-500/50' :
                  isExpiringSoon ? 'border-amber-500/50' :
                  'border-border'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="size-12 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                        {activeCategory === 'dedicated' && <Server className="size-6 text-muted-foreground" />}
                        {activeCategory === 'domains' && <Globe className="size-6 text-muted-foreground" />}
                        {activeCategory === 'storagebox' && <HardDrive className="size-6 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{service.name}</h3>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusColors[service.status] || 'bg-gray-500/20 text-gray-500 border-gray-500/30'}`}>
                            <span className={`size-1.5 rounded-full ${
                              service.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' :
                              service.status === 'GRACE_PERIOD' ? 'bg-orange-500 animate-pulse' :
                              service.status === 'SUSPENDED' ? 'bg-red-500' :
                              'bg-gray-500'
                            }`} />
                            {statusLabels[service.status] || service.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{service.plan.name}</p>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="size-3.5" />
                            <span>
                              {service.expiresAt ? (
                                <>
                                  {new Date(service.expiresAt).toLocaleDateString('ru-RU')}
                                  {daysRemaining !== null && (
                                    <span className={`ml-1 ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-500' : ''}`}>
                                      ({daysRemaining > 0 ? `${daysRemaining} дн.` : 'истёк'})
                                    </span>
                                  )}
                                </>
                              ) : '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Wallet className="size-3.5" />
                            <span>{service.plan.price} ₽/мес</span>
                          </div>
                        </div>

                        {service.status === 'GRACE_PERIOD' && service.gracePeriodEnd && (
                          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                            <AlertCircle className="size-4 text-orange-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <p className="text-orange-500 font-medium">Grace Period</p>
                              <p className="text-muted-foreground">
                                Продлите до {new Date(service.gracePeriodEnd).toLocaleDateString('ru-RU')} или сервис будет приостановлен
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : service.id)}
                        className="px-4 py-2 rounded-xl bg-accent text-foreground text-sm hover:bg-accent/80 transition-colors"
                      >
                        {isExpanded ? 'Скрыть' : 'Подробнее'}
                      </button>
                      {(service.status === 'ACTIVE' || service.status === 'GRACE_PERIOD') && (
                        <button
                          onClick={() => renewService(service.id, activeCategory, 1)}
                          disabled={renewingId === service.id}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
                        >
                          {renewingId === service.id ? (
                            <>
                              <RefreshCw className="size-4 animate-spin" />
                              Продление...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="size-4" />
                              Продлить
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      {activeCategory === 'dedicated' && (
                        <>
                          {service.ipAddress && (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">IP адрес</p>
                                <p className="text-sm font-mono text-foreground">{service.ipAddress}</p>
                              </div>
                              <button
                                onClick={() => copyToClipboard(service.ipAddress!, 'IP адрес')}
                                className="p-2 rounded-lg hover:bg-accent transition-colors"
                              >
                                <Copy className="size-4 text-muted-foreground" />
                              </button>
                            </div>
                          )}
                          {service.rootPassword && (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                              <div className="flex-1">
                                <p className="text-xs text-muted-foreground mb-1">Root пароль</p>
                                <p className="text-sm font-mono text-foreground">
                                  {showPasswords[service.id] ? service.rootPassword : '••••••••••••'}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => togglePassword(service.id)}
                                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                                >
                                  {showPasswords[service.id] ? (
                                    <EyeOff className="size-4 text-muted-foreground" />
                                  ) : (
                                    <Eye className="size-4 text-muted-foreground" />
                                  )}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(service.rootPassword!, 'Пароль')}
                                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                                >
                                  <Copy className="size-4 text-muted-foreground" />
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {activeCategory === 'domains' && service.registrar && (
                        <div className="p-3 rounded-lg bg-accent/50">
                          <p className="text-xs text-muted-foreground mb-1">Регистратор</p>
                          <p className="text-sm text-foreground">{service.registrar}</p>
                        </div>
                      )}

                      {activeCategory === 'storagebox' && (
                        <>
                          {service.ftpHost && (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">FTP Host</p>
                                <p className="text-sm font-mono text-foreground">{service.ftpHost}</p>
                              </div>
                              <button
                                onClick={() => copyToClipboard(service.ftpHost!, 'FTP Host')}
                                className="p-2 rounded-lg hover:bg-accent transition-colors"
                              >
                                <Copy className="size-4 text-muted-foreground" />
                              </button>
                            </div>
                          )}
                          {service.ftpUser && (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">FTP User</p>
                                <p className="text-sm font-mono text-foreground">{service.ftpUser}</p>
                              </div>
                              <button
                                onClick={() => copyToClipboard(service.ftpUser!, 'FTP User')}
                                className="p-2 rounded-lg hover:bg-accent transition-colors"
                              >
                                <Copy className="size-4 text-muted-foreground" />
                              </button>
                            </div>
                          )}
                          {service.ftpPassword && (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                              <div className="flex-1">
                                <p className="text-xs text-muted-foreground mb-1">FTP Password</p>
                                <p className="text-sm font-mono text-foreground">
                                  {showPasswords[service.id] ? service.ftpPassword : '••••••••••••'}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => togglePassword(service.id)}
                                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                                >
                                  {showPasswords[service.id] ? (
                                    <EyeOff className="size-4 text-muted-foreground" />
                                  ) : (
                                    <Eye className="size-4 text-muted-foreground" />
                                  )}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(service.ftpPassword!, 'FTP Password')}
                                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                                >
                                  <Copy className="size-4 text-muted-foreground" />
                                </button>
                              </div>
                            </div>
                          )}
                          {service.sizeGB && (
                            <div className="p-3 rounded-lg bg-accent/50">
                              <p className="text-xs text-muted-foreground mb-1">Размер</p>
                              <p className="text-sm text-foreground">{service.sizeGB} GB</p>
                            </div>
                          )}
                        </>
                      )}

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="p-3 rounded-lg bg-accent/30">
                          <p className="text-xs text-muted-foreground mb-1">Создан</p>
                          <p className="text-sm text-foreground">
                            {new Date(service.createdAt).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-accent/30">
                          <p className="text-xs text-muted-foreground mb-1">Стоимость продления</p>
                          <p className="text-sm text-foreground">{service.plan.price} ₽/мес</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
