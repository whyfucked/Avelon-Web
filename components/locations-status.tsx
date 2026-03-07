"use client"

import { useEffect, useState } from "react"
import { Server, Globe, ExternalLink, ChevronDown, CheckCircle2, XCircle, Router } from "lucide-react"
import Link from "next/link"

interface ServiceStatus {
  id: string
  name: string
  type: "WEB" | "GAME" | "NODE" | "ROUTER"
  isOnline: boolean
  lastCheck: string
  responseTime: number | null
  uptime: number
  avgResponseTime: number | null
  node: {
    name: string
    locationName: string | null
    countryCode: string | null
  } | null
  history: {
    isOnline: boolean
    responseTime: number | null
    checkedAt: string
  }[]
}

export function LocationsStatus() {
  const [statuses, setStatuses] = useState<ServiceStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [nodesOpen, setNodesOpen] = useState(false)
  const [routersOpen, setRoutersOpen] = useState(false)
  const [webOpen, setWebOpen] = useState(false)

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const res = await fetch('/api/status')
        if (res.ok) {
          const data = await res.json()
          setStatuses(data)
        }
      } catch (error) {
        console.error('Failed to fetch statuses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatuses()
    const interval = setInterval(fetchStatuses, 60000)
    return () => clearInterval(interval)
  }, [])

  const nodes = statuses.filter(s => s.type === 'NODE')
  const routers = statuses.filter(s => s.type === 'ROUTER')
  const web = statuses.filter(s => s.type === 'WEB' || s.type === 'GAME')
  
  const nodesOnline = nodes.filter(s => s.isOnline).length
  const routersOnline = routers.filter(s => s.isOnline).length
  const webOnline = web.filter(s => s.isOnline).length

  const allOnline = statuses.every(s => s.isOnline)
  const avgUptime = statuses.length > 0 
    ? (statuses.reduce((acc, s) => acc + s.uptime, 0) / statuses.length).toFixed(2)
    : "100.00"

  if (loading) {
    return (
      <section className="px-3 sm:px-8 md:px-16 lg:px-24">
        <div className="max-w-[1320px] mx-auto">
          <div className="animate-pulse space-y-3 sm:space-y-4">
            <div className="h-6 sm:h-8 w-36 sm:w-48 bg-muted rounded-lg" />
            <div className="h-14 sm:h-16 bg-muted/50 rounded-xl sm:rounded-2xl" />
            <div className="h-14 sm:h-16 bg-muted/50 rounded-xl sm:rounded-2xl" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="px-3 sm:px-8 md:px-16 lg:px-24">
      <div className="max-w-[1320px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-4 sm:mb-6">
          <div>
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground md:text-3xl mb-1 sm:mb-2">
              Статус сервисов
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Мониторинг в реальном времени
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`size-2 sm:size-2.5 rounded-full ${allOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="text-xs sm:text-sm text-muted-foreground">
              Uptime: <span className="font-medium text-foreground">{avgUptime}%</span>
            </span>
          </div>
        </div>

        {/* Accordion sections */}
        <div className="rounded-xl sm:rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden mb-4 sm:mb-6">
          {/* Nodes section */}
          <div>
            <button
              onClick={() => setNodesOpen(!nodesOpen)}
              className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="size-7 sm:size-8 rounded-md sm:rounded-lg bg-muted/50 flex items-center justify-center">
                  <Server className="size-3.5 sm:size-4 text-muted-foreground" />
                </div>
                <span className="font-medium text-sm sm:text-base text-foreground">Узлы</span>
                <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${
                  nodes.length === 0 
                    ? 'bg-muted text-muted-foreground'
                    : nodesOnline === nodes.length 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : 'bg-red-500/10 text-red-500'
                }`}>
                  {nodes.length === 0 ? 'НЕТ' : nodesOnline === nodes.length ? 'OK' : '!'} {nodesOnline}/{nodes.length}
                </span>
              </div>
              <ChevronDown className={`size-4 sm:size-5 text-muted-foreground transition-transform ${nodesOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {nodesOpen && (
              <div className="border-t border-border/50 divide-y divide-border/50 animate-in fade-in slide-in-from-top-2 duration-200">
                {nodes.map((status, index) => (
                  <div 
                    key={status.id} 
                    className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 animate-in fade-in slide-in-from-left-2 duration-200"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs sm:text-sm text-foreground">
                        {status.node?.name || status.name}
                      </span>
                      {status.responseTime && (
                        <span className="text-[10px] sm:text-xs text-muted-foreground">{status.responseTime}ms</span>
                      )}
                    </div>
                    {status.isOnline ? (
                      <CheckCircle2 className="size-3.5 sm:size-4 text-emerald-500" />
                    ) : (
                      <XCircle className="size-3.5 sm:size-4 text-red-500" />
                    )}
                  </div>
                ))}
                {nodes.length === 0 && (
                  <div className="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-muted-foreground">Нет узлов</div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border/50" />

          {/* Routers section */}
          <div>
            <button
              onClick={() => setRoutersOpen(!routersOpen)}
              className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="size-7 sm:size-8 rounded-md sm:rounded-lg bg-muted/50 flex items-center justify-center">
                  <Router className="size-3.5 sm:size-4 text-muted-foreground" />
                </div>
                <span className="font-medium text-sm sm:text-base text-foreground">Роутеры</span>
                <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${
                  routers.length === 0 
                    ? 'bg-muted text-muted-foreground'
                    : routersOnline === routers.length 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : 'bg-red-500/10 text-red-500'
                }`}>
                  {routers.length === 0 ? 'НЕТ' : routersOnline === routers.length ? 'OK' : '!'} {routersOnline}/{routers.length}
                </span>
              </div>
              <ChevronDown className={`size-4 sm:size-5 text-muted-foreground transition-transform ${routersOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {routersOpen && (
              <div className="border-t border-border/50 divide-y divide-border/50 animate-in fade-in slide-in-from-top-2 duration-200">
                {routers.map((status, index) => (
                  <div 
                    key={status.id} 
                    className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 animate-in fade-in slide-in-from-left-2 duration-200"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs sm:text-sm text-foreground">{status.name}</span>
                      {status.responseTime && (
                        <span className="text-[10px] sm:text-xs text-muted-foreground">{status.responseTime}ms</span>
                      )}
                    </div>
                    {status.isOnline ? (
                      <CheckCircle2 className="size-3.5 sm:size-4 text-emerald-500" />
                    ) : (
                      <XCircle className="size-3.5 sm:size-4 text-red-500" />
                    )}
                  </div>
                ))}
                {routers.length === 0 && (
                  <div className="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-muted-foreground">Нет роутеров</div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border/50" />

          {/* Web section */}
          <div>
            <button
              onClick={() => setWebOpen(!webOpen)}
              className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="size-7 sm:size-8 rounded-md sm:rounded-lg bg-muted/50 flex items-center justify-center">
                  <Globe className="size-3.5 sm:size-4 text-muted-foreground" />
                </div>
                <span className="font-medium text-sm sm:text-base text-foreground">Веб-сервисы</span>
                <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${
                  web.length === 0 
                    ? 'bg-muted text-muted-foreground'
                    : webOnline === web.length 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : 'bg-red-500/10 text-red-500'
                }`}>
                  {web.length === 0 ? 'НЕТ' : webOnline === web.length ? 'OK' : '!'} {webOnline}/{web.length}
                </span>
              </div>
              <ChevronDown className={`size-4 sm:size-5 text-muted-foreground transition-transform ${webOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {webOpen && (
              <div className="border-t border-border/50 divide-y divide-border/50 animate-in fade-in slide-in-from-top-2 duration-200">
                {web.map((status, index) => (
                  <div 
                    key={status.id} 
                    className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 animate-in fade-in slide-in-from-left-2 duration-200"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs sm:text-sm text-foreground">{status.name}</span>
                      {status.responseTime && (
                        <span className="text-[10px] sm:text-xs text-muted-foreground">{status.responseTime}ms</span>
                      )}
                    </div>
                    {status.isOnline ? (
                      <CheckCircle2 className="size-3.5 sm:size-4 text-emerald-500" />
                    ) : (
                      <XCircle className="size-3.5 sm:size-4 text-red-500" />
                    )}
                  </div>
                ))}
                {web.length === 0 && (
                  <div className="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-muted-foreground">Нет веб-сервисов</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer link */}
        <div className="flex justify-center">
          <Link 
            href="/status"
            className="group flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            Подробная статистика
            <ExternalLink className="size-3 sm:size-3.5 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        </div>
      </div>
    </section>
  )
}
