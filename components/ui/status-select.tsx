"use client"

import { CustomSelect } from "@/components/admin/custom-select"
import { Circle, CheckCircle, XCircle, AlertCircle, Clock, Pause, RotateCcw } from "lucide-react"

interface StatusOption {
  value: string
  label: string
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple'
  description?: string
}

interface StatusSelectProps {
  options: StatusOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  type?: 'server' | 'vds' | 'general'
}

// Предустановленные статусы для разных типов
const serverStatuses: StatusOption[] = [
  { value: 'ACTIVE', label: 'Активен', color: 'green', description: 'Сервер работает' },
  { value: 'SUSPENDED', label: 'Приостановлен', color: 'yellow', description: 'Сервер приостановлен' },
  { value: 'OFF', label: 'Выключен', color: 'red', description: 'Сервер выключен' },
  { value: 'PENDING', label: 'Ожидание', color: 'blue', description: 'Ожидает создания' },
  { value: 'INSTALLING', label: 'Установка', color: 'blue', description: 'Идет установка' },
  { value: 'RESTARTING', label: 'Перезагрузка', color: 'purple', description: 'Перезагружается' },
  { value: 'DELETED', label: 'Удален', color: 'gray', description: 'Сервер удален' },
]

const vdsStatuses: StatusOption[] = [
  { value: 'running', label: 'Запущен', color: 'green', description: 'VDS работает' },
  { value: 'stopped', label: 'Остановлен', color: 'red', description: 'VDS остановлен' },
  { value: 'suspended', label: 'Приостановлен', color: 'yellow', description: 'VDS приостановлен' },
  { value: 'installing', label: 'Установка', color: 'blue', description: 'Идет установка' },
  { value: 'restarting', label: 'Перезагрузка', color: 'purple', description: 'Перезагружается' },
]

const generalStatuses: StatusOption[] = [
  { value: 'true', label: 'Активен', color: 'green' },
  { value: 'false', label: 'Неактивен', color: 'red' },
]

// Функция для получения иконки и цвета статуса
const getStatusIcon = (color: string | undefined) => {
  const colorClasses = {
    green: 'text-emerald-500',
    red: 'text-red-500',
    yellow: 'text-amber-500',
    blue: 'text-blue-500',
    gray: 'text-gray-500',
    purple: 'text-purple-500'
  }

  const iconClass = colorClasses[color as keyof typeof colorClasses] || 'text-muted-foreground'

  switch (color) {
    case 'green':
      return <CheckCircle className={`size-4 ${iconClass}`} />
    case 'red':
      return <XCircle className={`size-4 ${iconClass}`} />
    case 'yellow':
      return <AlertCircle className={`size-4 ${iconClass}`} />
    case 'blue':
      return <Clock className={`size-4 ${iconClass}`} />
    case 'purple':
      return <RotateCcw className={`size-4 ${iconClass}`} />
    case 'gray':
      return <Pause className={`size-4 ${iconClass}`} />
    default:
      return <Circle className={`size-4 ${iconClass}`} />
  }
}

export function StatusSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Выберите статус", 
  className, 
  disabled,
  type = 'general'
}: StatusSelectProps) {
  // Используем переданные опции или предустановленные в зависимости от типа
  let finalOptions = options
  if (options.length === 0) {
    switch (type) {
      case 'server':
        finalOptions = serverStatuses
        break
      case 'vds':
        finalOptions = vdsStatuses
        break
      default:
        finalOptions = generalStatuses
        break
    }
  }

  const selectOptions = finalOptions.map(status => ({
    value: status.value,
    label: status.label,
    sublabel: status.description,
    icon: getStatusIcon(status.color)
  }))

  return (
    <CustomSelect
      options={selectOptions}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      searchable={false}
      clearable={false}
    />
  )
}