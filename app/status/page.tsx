"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ArrowLeft, Globe, Server, RefreshCw, ChevronDown, CheckCircle2, XCircle, Router } from "lucide-react"

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

export default function StatusPage() {
  const [statuses, setStatuses] = useState<ServiceStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [nodesOpen, setNodesOpen] = useState(true)
  const [routersOpen, setRoutersOpen] = useState(true)
  const [infraOpen, setInfraOpen] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(0)

  const fetchStatuses = async (showRefresh = false) => {
    if (showRefresh) {
      const now = Date.now()
      if (now - lastRefresh < 10000) {
        const remaining = Math.ceil((10000 - (now - lastRefresh)) / 1000)
        toast.error(`Подождите ${remaining} сек`)
        return
      }
      setRefreshing(true)
      setLastRefresh(now)
    }
    try {
      const res = await fetch('/api/status')
      if (res.ok) {
        const data = await res.json()
        setStatuses(data)
        if (showRefresh) {
          toast.success('Данные обновлены')
        }
      }
    } catch (error) {
      console.error('Failed to fetch statuses:', error)
      if (showRefresh) {
        toast.error('Ошибка обновления')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStatuses()
    const interval = setInterval(() => fetchStatuses(), 30000)
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
    ? (statuses.reduce((acc, s) => acc + s.uptime, 0) / statuses.length)
    : 100

  return (
    <main className="relative min-h-screen bg-background">
      <Navbar />

      <section className="px-4 md:px-8 lg:px-24 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="size-4" />
            На главную
          </Link>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground mb-1">Статус сервисов</h1>
              <p className="text-sm text-muted-foreground">Обновляется каждые 30 секунд</p>
            </div>
            <button 
              onClick={() => fetchStatuses(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card/50 text-sm text-muted-foreground hover:text-foreground hover:bg-card transition-all disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>

          {/* Status banner */}
          <div className={`rounded-2xl p-5 mb-6 ${allOnline ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`size-3 rounded-full ${allOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className={`font-heading font-medium ${allOnline ? 'text-emerald-500' : 'text-red-500'}`}>
                  {allOnline ? 'Все системы работают' : 'Есть проблемы'}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                Uptime: <span className="font-medium text-foreground">{avgUptime.toFixed(2)}%</span>
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="size-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
              {/* Nodes section */}
              <div>
                <button
                  onClick={() => setNodesOpen(!nodesOpen)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-muted/50 flex items-center justify-center">
                      <Server className="size-4 text-muted-foreground" />
                    </div>
                    <span className="font-medium text-foreground">Узлы</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      nodesOnline === nodes.length 
                        ? 'bg-emerald-500/10 text-emerald-500' 
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      {nodesOnline === nodes.length ? 'АКТИВНЫ' : 'ПРОБЛЕМЫ'} {nodesOnline}/{nodes.length}
                    </span>
                  </div>
                  <ChevronDown className={`size-5 text-muted-foreground transition-transform ${nodesOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {nodesOpen && (
                  <div className="border-t border-border/50">
                    {nodes.map((status) => (
                      <div key={status.id} className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground">
                            {status.node?.name || status.name}
                          </span>
                          {status.responseTime && (
                            <span className="text-xs text-muted-foreground">{status.responseTime}ms</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{status.uptime.toFixed(1)}%</span>
                          {status.isOnline ? (
                            <CheckCircle2 className="size-4 text-emerald-500" />
                          ) : (
                            <XCircle className="size-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                    {nodes.length === 0 && (
                      <div className="px-4 py-6 text-sm text-muted-foreground text-center">Нет узлов</div>
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
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-muted/50 flex items-center justify-center">
                      <Router className="size-4 text-muted-foreground" />
                    </div>
                    <span className="font-medium text-foreground">Роутеры</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      routers.length === 0 
                        ? 'bg-muted text-muted-foreground'
                        : routersOnline === routers.length 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : 'bg-red-500/10 text-red-500'
                    }`}>
                      {routers.length === 0 ? 'НЕТ' : routersOnline === routers.length ? 'АКТИВНЫ' : 'ПРОБЛЕМЫ'} {routersOnline}/{routers.length}
                    </span>
                  </div>
                  <ChevronDown className={`size-5 text-muted-foreground transition-transform ${routersOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {routersOpen && (
                  <div className="border-t border-border/50">
                    {routers.map((status) => (
                      <div key={status.id} className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground">{status.name}</span>
                          {status.responseTime && (
                            <span className="text-xs text-muted-foreground">{status.responseTime}ms</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{status.uptime.toFixed(1)}%</span>
                          {status.isOnline ? (
                            <CheckCircle2 className="size-4 text-emerald-500" />
                          ) : (
                            <XCircle className="size-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                    {routers.length === 0 && (
                      <div className="px-4 py-6 text-sm text-muted-foreground text-center">Нет роутеров</div>
                    )}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-border/50" />

              {/* Web section */}
              <div>
                <button
                  onClick={() => setInfraOpen(!infraOpen)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-muted/50 flex items-center justify-center">
                      <Globe className="size-4 text-muted-foreground" />
                    </div>
                    <span className="font-medium text-foreground">Веб-сервисы</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      web.length === 0 
                        ? 'bg-muted text-muted-foreground'
                        : webOnline === web.length 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : 'bg-red-500/10 text-red-500'
                    }`}>
                      {web.length === 0 ? 'НЕТ' : webOnline === web.length ? 'АКТИВНЫ' : 'ПРОБЛЕМЫ'} {webOnline}/{web.length}
                    </span>
                  </div>
                  <ChevronDown className={`size-5 text-muted-foreground transition-transform ${infraOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {infraOpen && (
                  <div className="border-t border-border/50">
                    {web.map((status) => (
                      <div key={status.id} className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground">{status.name}</span>
                          {status.responseTime && (
                            <span className="text-xs text-muted-foreground">{status.responseTime}ms</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{status.uptime.toFixed(1)}%</span>
                          {status.isOnline ? (
                            <CheckCircle2 className="size-4 text-emerald-500" />
                          ) : (
                            <XCircle className="size-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                    {web.length === 0 && (
                      <div className="px-4 py-6 text-sm text-muted-foreground text-center">Нет веб-сервисов</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
