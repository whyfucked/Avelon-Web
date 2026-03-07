"use client"

import { CustomSelect } from "@/components/admin/custom-select"
import { Monitor, Server, HardDrive, Cpu } from "lucide-react"

interface OsOption {
  vmManagerId: number
  name: string
  isActive?: boolean
}

interface OsSelectProps {
  options: OsOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

// Функция для определения иконки ОС
const getOsIcon = (osName: string) => {
  const name = osName.toLowerCase()
  
  if (name.includes('windows')) {
    return <div className="size-4 bg-blue-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">W</div>
  }
  if (name.includes('ubuntu')) {
    return <div className="size-4 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">U</div>
  }
  if (name.includes('centos') || name.includes('rhel')) {
    return <div className="size-4 bg-red-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">C</div>
  }
  if (name.includes('debian')) {
    return <div className="size-4 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold">D</div>
  }
  if (name.includes('freebsd')) {
    return <div className="size-4 bg-red-700 rounded-sm flex items-center justify-center text-white text-xs font-bold">F</div>
  }
  if (name.includes('astra')) {
    return <div className="size-4 bg-blue-600 rounded-sm flex items-center justify-center text-white text-xs font-bold">A</div>
  }
  if (name.includes('noos')) {
    return <div className="size-4 bg-gray-600 rounded-sm flex items-center justify-center text-white text-xs font-bold">N</div>
  }
  
  // По умолчанию
  return <Monitor className="size-4 text-muted-foreground" />
}

// Функция для определения группы ОС
const getOsGroup = (osName: string) => {
  const name = osName.toLowerCase()
  
  if (name.includes('windows')) return 'Windows'
  if (name.includes('ubuntu')) return 'Ubuntu'
  if (name.includes('centos') || name.includes('rhel')) return 'CentOS/RHEL'
  if (name.includes('debian')) return 'Debian'
  if (name.includes('freebsd')) return 'FreeBSD'
  if (name.includes('astra')) return 'Astra Linux'
  if (name.includes('noos')) return 'NoOS'
  
  return 'Другие'
}

export function OsSelect({ options, value, onChange, placeholder = "Выберите ОС", className, disabled }: OsSelectProps) {
  const selectOptions = options
    .filter(os => os.isActive !== false)
    .map(os => ({
      value: os.vmManagerId.toString(),
      label: os.name,
      icon: getOsIcon(os.name),
      group: getOsGroup(os.name),
      sublabel: `ID: ${os.vmManagerId}`
    }))

  return (
    <CustomSelect
      options={selectOptions}
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