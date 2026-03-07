"use client"

import { CustomSelect } from "@/components/admin/custom-select"
import { User, Shield, Activity, Wallet, Server, Settings, Plus, Trash2, Pause, Play } from "lucide-react"

interface ActionSelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
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

const getActionIcon = (action: string) => {
  if (action.includes('LOGIN')) return <User className="size-4 text-green-500" />
  if (action.includes('LOGOUT')) return <User className="size-4 text-gray-500" />
  if (action.includes('REGISTER')) return <Plus className="size-4 text-blue-500" />
  if (action.includes('BALANCE')) return <Wallet className="size-4 text-amber-500" />
  if (action.includes('SERVER') || action.includes('VDS')) return <Server className="size-4 text-purple-500" />
  if (action.includes('ADMIN')) return <Shield className="size-4 text-red-500" />
  if (action.includes('SETTINGS')) return <Settings className="size-4 text-gray-500" />
  if (action.includes('CREATE')) return <Plus className="size-4 text-green-500" />
  if (action.includes('DELETE')) return <Trash2 className="size-4 text-red-500" />
  if (action.includes('SUSPEND')) return <Pause className="size-4 text-yellow-500" />
  if (action.includes('UNSUSPEND')) return <Play className="size-4 text-green-500" />
  return <Activity className="size-4 text-muted-foreground" />
}

const getActionGroup = (action: string) => {
  if (action.includes('USER') && !action.includes('ADMIN')) return 'Пользователи'
  if (action.includes('ADMIN')) return 'Администраторы'
  if (action.includes('BALANCE')) return 'Баланс'
  if (action.includes('SERVER') || action.includes('VDS')) return 'Серверы'
  if (action.includes('PLAN')) return 'Планы'
  if (action.includes('SETTINGS')) return 'Настройки'
  return 'Другие'
}

export function ActionSelect({ value, onChange, placeholder = "Все действия", className, disabled }: ActionSelectProps) {
  const options = [
    { value: '', label: 'Все действия', icon: <Activity className="size-4 text-muted-foreground" /> },
    ...Object.entries(actionLabels).map(([key, label]) => ({
      value: key,
      label,
      icon: getActionIcon(key),
      group: getActionGroup(key)
    }))
  ]

  return (
    <CustomSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      searchable={true}
      clearable={true}
    />
  )
}