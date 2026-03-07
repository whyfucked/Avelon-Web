"use client"

import { CustomSelect } from "@/components/admin/custom-select"
import { Cpu, MemoryStick, HardDrive, Zap, Cloud, Server } from "lucide-react"

interface PlanOption {
  id: string
  name: string
  category: string
  price: number
  ram: number
  cpu: number
  disk: number
  isActive?: boolean
  isFree?: boolean
}

interface PlanSelectProps {
  options: PlanOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  showPrices?: boolean
}

// Функция для форматирования размера
const formatSize = (mb: number) => {
  if (mb >= 1024) {
    const gb = mb / 1024
    return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`
  }
  return `${mb} MB`
}

// Функция для получения иконки категории
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'MINECRAFT':
      return <div className="size-4 bg-green-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">M</div>
    case 'CODING':
      return <div className="size-4 bg-blue-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">C</div>
    case 'VDS':
      return <Cloud className="size-4 text-purple-500" />
    default:
      return <Server className="size-4 text-muted-foreground" />
  }
}

export function PlanSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Выберите план", 
  className, 
  disabled,
  showPrices = true 
}: PlanSelectProps) {
  const selectOptions = options
    .filter(plan => plan.isActive !== false)
    .map(plan => {
      const specs = plan.category === 'VDS' 
        ? `VDS план` 
        : `${formatSize(plan.ram)} RAM • ${plan.cpu}% CPU • ${formatSize(plan.disk)}`
      
      const priceText = showPrices 
        ? plan.isFree 
          ? 'Бесплатно' 
          : `${plan.price} ₽/мес`
        : ''

      return {
        value: plan.id,
        label: plan.name,
        sublabel: `${specs}${priceText ? ` • ${priceText}` : ''}`,
        icon: getCategoryIcon(plan.category),
        group: plan.category === 'MINECRAFT' ? 'Minecraft' : 
               plan.category === 'CODING' ? 'Coding' : 
               plan.category === 'VDS' ? 'VDS' : 'Другие',
        disabled: !plan.isActive
      }
    })

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