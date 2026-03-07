"use client"

import { Server, RefreshCw } from "lucide-react"

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

interface AdminServersTableProps {
  servers: ServerData[]
  searchQuery: string
  onRefresh: () => void
  onServerAction: (serverId: string, action: string, force?: boolean) => void
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

export function AdminServersTable({ 
  servers, 
  searchQuery, 
  onRefresh, 
  onServerAction 
}: AdminServersTableProps) {
  const activeServers = servers.filter(s => s.status !== 'DELETED').length
  
  const filteredServers = servers.filter(s => 
    !searchQuery || 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-foreground">{activeServers} серверов</h1>
        <button 
          onClick={onRefresh} 
          className="size-9 rounded-xl bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
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
            {filteredServers.map((server) => (
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
                  <span className={`text-xs px-2.5 py-1 rounded-full ${statusColors[server.status]}`}>
                    {statusLabels[server.status] || server.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {(server.status === 'ACTIVE' || server.status === 'OFF') && (
                      <button 
                        onClick={() => onServerAction(server.id, 'suspend')} 
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors"
                      >
                        Suspend
                      </button>
                    )}
                    {server.status === 'SUSPENDED' && (
                      <button 
                        onClick={() => onServerAction(server.id, 'unsuspend')} 
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                      >
                        Unsuspend
                      </button>
                    )}
                    {server.status !== 'DELETED' && (
                      <>
                        <button 
                          onClick={() => onServerAction(server.id, 'delete')} 
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                        >
                          Delete
                        </button>
                        <button 
                          onClick={() => onServerAction(server.id, 'force_delete')} 
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors" 
                          title="Принудительное удаление (только из БД)"
                        >
                          Force
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredServers.length === 0 && (
          <div className="px-5 py-12 text-center text-muted-foreground">
            <Server className="size-12 mx-auto mb-3 opacity-50" />
            <p>Серверы не найдены</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Export for use in dashboard recent servers
export function RecentServersTable({ 
  servers, 
  onViewAll 
}: { 
  servers: ServerData[]
  onViewAll: () => void 
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="font-medium text-foreground">Последние серверы</h3>
        <button onClick={onViewAll} className="text-sm text-primary hover:underline">Все →</button>
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
            <span className={`text-xs px-2.5 py-1 rounded-full ${statusColors[server.status]}`}>
              {server.status}
            </span>
          </div>
        ))}
        {servers.length === 0 && (
          <div className="px-5 py-8 text-center text-muted-foreground">Нет серверов</div>
        )}
      </div>
    </div>
  )
}
