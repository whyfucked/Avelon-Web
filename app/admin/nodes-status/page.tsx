"use client"

import { useState, useEffect } from "react"
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react"

interface NodeStatus {
  id: number
  name: string
  fqdn: string
  wingsStatus: 'online' | 'offline' | 'error' | 'unknown'
  wingsUrl: string
  inDatabase: boolean
  dbActive?: boolean
  dbFree?: boolean
  dbType?: string
}

export default function NodesStatusPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/debug/pterodactyl-nodes')
      const json = await res.json()
      if (res.ok) {
        setData(json)
      } else {
        setError(json.error || 'Ошибка загрузки')
      }
    } catch (e) {
      setError('Ошибка сети')
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <XCircle className="size-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">Ошибка</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Статус нод Pterodactyl</h1>
          <p className="text-sm text-muted-foreground">
            Pterodactyl: {data.pterodactylUrl} | Всего нод: {data.totalNodes} | В БД: {data.dbNodes}
          </p>
        </div>

        <div className="grid gap-4">
          {data.nodes?.map((node: NodeStatus) => (
            <div
              key={node.id}
              className="p-4 rounded-xl border border-border/50 bg-card/30"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium">{node.name}</h3>
                  <p className="text-xs text-muted-foreground">ID: {node.id} | FQDN: {node.fqdn}</p>
                </div>
                <div className="flex items-center gap-2">
                  {node.wingsStatus === 'online' && (
                    <div className="flex items-center gap-1.5 text-emerald-500">
                      <CheckCircle2 className="size-4" />
                      <span className="text-xs font-medium">Wings Online</span>
                    </div>
                  )}
                  {node.wingsStatus === 'offline' && (
                    <div className="flex items-center gap-1.5 text-red-500">
                      <XCircle className="size-4" />
                      <span className="text-xs font-medium">Wings Offline</span>
                    </div>
                  )}
                  {node.wingsStatus === 'error' && (
                    <div className="flex items-center gap-1.5 text-orange-500">
                      <AlertCircle className="size-4" />
                      <span className="text-xs font-medium">Wings Error</span>
                    </div>
                  )}
                  {node.wingsStatus === 'unknown' && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <AlertCircle className="size-4" />
                      <span className="text-xs font-medium">Unknown</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Wings URL:</span>
                  <p className="font-mono">{node.wingsUrl}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">В БД:</span>
                  <p>{node.inDatabase ? '✅ Да' : '❌ Нет'}</p>
                </div>
                {node.inDatabase && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Активна:</span>
                      <p>{node.dbActive ? '✅ Да' : '❌ Нет'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Тип:</span>
                      <p>{node.dbType || 'N/A'} {node.dbFree ? '(Free)' : '(Paid)'}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={loadStatus}
          className="mt-6 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors"
        >
          Обновить
        </button>
      </div>
    </div>
  )
}
