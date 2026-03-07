"use client"

import { useState, useEffect } from 'react'
import { Search, Filter, Calendar, User, Shield, Activity, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ActionSelect } from '@/components/ui/action-select'
import { UserSelect } from '@/components/ui/user-select'

interface AdminLog {
  id: string
  action: string
  description: string
  ipAddress: string | null
  userAgent: string | null
  metadata: string | null
  createdAt: string
  user: {
    id: string
    email: string
    name: string | null
  } | null
  admin: {
    id: string
    email: string
    name: string | null
  } | null
}

interface LogsResponse {
  logs: AdminLog[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

const actionLabels: Record<string, string> = {
  USER_LOGIN: 'Вход пользователя',
  USER_LOGOUT: 'Выход пользователя',
  USER_REGISTER: 'Регистрация',
  BALANCE_ADD: 'Пополнение баланса',
  BALANCE_SUBTRACT: 'Списание баланса',
  SERVER_CREATE: 'Создание сервера',
  SERVER_DELETE: 'Удаление сервера',
  SERVER_SUSPEND: 'Приостановка сервера',
  SERVER_UNSUSPEND: 'Возобновление сервера',
  VDS_CREATE: 'Создание VDS',
  VDS_DELETE: 'Удаление VDS',
  VDS_SUSPEND: 'Приостановка VDS',
  VDS_UNSUSPEND: 'Возобновление VDS',
  ADMIN_LOGIN: 'Вход администратора',
  ADMIN_LOGOUT: 'Выход администратора',
  SETTINGS_UPDATE: 'Изменение настроек',
  PLAN_CREATE: 'Создание плана',
  PLAN_UPDATE: 'Изменение плана',
  PLAN_DELETE: 'Удаление плана',
  USER_UPDATE: 'Изменение пользователя',
  USER_DELETE: 'Удаление пользователя',
}

const actionColors: Record<string, string> = {
  USER_LOGIN: 'bg-green-500/10 text-green-500',
  USER_LOGOUT: 'bg-gray-500/10 text-gray-500',
  USER_REGISTER: 'bg-blue-500/10 text-blue-500',
  BALANCE_ADD: 'bg-emerald-500/10 text-emerald-500',
  BALANCE_SUBTRACT: 'bg-red-500/10 text-red-500',
  SERVER_CREATE: 'bg-blue-500/10 text-blue-500',
  SERVER_DELETE: 'bg-red-500/10 text-red-500',
  VDS_CREATE: 'bg-purple-500/10 text-purple-500',
  VDS_DELETE: 'bg-red-500/10 text-red-500',
  ADMIN_LOGIN: 'bg-orange-500/10 text-orange-500',
  SETTINGS_UPDATE: 'bg-yellow-500/10 text-yellow-500',
}

export function AdminLogsTable() {
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  })
  
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    adminId: '',
    search: ''
  })

  const loadLogs = async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.action && { action: filters.action }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.adminId && { adminId: filters.adminId }),
      })

      const res = await fetch(`/api/admin/logs?${params}`)
      if (res.ok) {
        const data: LogsResponse = await res.json()
        setLogs(data.logs)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error loading logs:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadLogs(1)
  }, [filters])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd.MM.yyyy HH:mm:ss', { locale: ru })
  }

  const getActionIcon = (action: string) => {
    if (action.includes('LOGIN')) return <User className="size-4" />
    if (action.includes('BALANCE')) return <Activity className="size-4" />
    if (action.includes('ADMIN')) return <Shield className="size-4" />
    return <Activity className="size-4" />
  }

  const filteredLogs = logs.filter(log => {
    if (!filters.search) return true
    const searchLower = filters.search.toLowerCase()
    return (
      log.description.toLowerCase().includes(searchLower) ||
      log.user?.email.toLowerCase().includes(searchLower) ||
      log.admin?.email.toLowerCase().includes(searchLower) ||
      log.ipAddress?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Логи системы</h1>
          <p className="text-muted-foreground">История действий пользователей и администраторов</p>
        </div>
      </div>

      {/* Фильтры */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-card/30 rounded-xl border border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <ActionSelect
          value={filters.action}
          onChange={(value) => handleFilterChange('action', value)}
          placeholder="Все действия"
        />

        <UserSelect
          value={filters.userId}
          onChange={(value) => handleFilterChange('userId', value)}
          placeholder="Все пользователи"
          type="users"
        />

        <UserSelect
          value={filters.adminId}
          onChange={(value) => handleFilterChange('adminId', value)}
          placeholder="Все администраторы"
          type="admins"
        />
      </div>

      {/* Таблица логов */}
      <div className="bg-card/30 rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/20">
              <tr>
                <th className="text-left p-4 font-medium text-muted-foreground">Время</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Действие</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Описание</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Пользователь</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Администратор</th>
                <th className="text-left p-4 font-medium text-muted-foreground">IP адрес</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Загрузка...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Логи не найдены
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="border-t border-border/50 hover:bg-muted/10">
                    <td className="p-4 text-sm text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${actionColors[log.action] || 'bg-gray-500/10 text-gray-500'}`}>
                          {getActionIcon(log.action)}
                        </div>
                        <span className="text-sm font-medium">
                          {actionLabels[log.action] || log.action}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-foreground max-w-xs truncate">
                      {log.description}
                    </td>
                    <td className="p-4 text-sm">
                      {log.user ? (
                        <div>
                          <div className="font-medium text-foreground">
                            {log.user.name || log.user.email.split('@')[0]}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {log.user.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4 text-sm">
                      {log.admin ? (
                        <div>
                          <div className="font-medium text-foreground">
                            {log.admin.name || log.admin.email.split('@')[0]}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {log.admin.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {log.ipAddress || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Пагинация */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border/50">
            <div className="text-sm text-muted-foreground">
              Показано {filteredLogs.length} из {pagination.total} записей
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadLogs(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg bg-background border border-border hover:bg-muted/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="px-3 py-1 text-sm">
                {pagination.page} из {pagination.pages}
              </span>
              <button
                onClick={() => loadLogs(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="p-2 rounded-lg bg-background border border-border hover:bg-muted/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}