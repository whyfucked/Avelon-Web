"use client"

import { CustomSelect } from "@/components/admin/custom-select"
import { Globe, Wifi, WifiOff, Zap, Server } from "lucide-react"
import Image from "next/image"

interface NodeOption {
  id: string
  name: string
  locationName?: string | null
  countryCode?: string | null
  isActive?: boolean
  isFree?: boolean
  priceModifier?: number
  nodeType?: 'MINECRAFT' | 'CODING'
  _count?: { servers: number }
}

interface NodeSelectProps {
  options: NodeOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  showPrices?: boolean
  filterByType?: 'MINECRAFT' | 'CODING'
}

// Функция для получения флага страны
const getCountryFlag = (countryCode: string | null) => {
  if (!countryCode) return <Globe className="size-4 text-muted-foreground" />
  
  const flagPath = countryCode === 'fi' ? '/finland.png' : `/${countryCode}.png`
  
  return (
    <div className="size-4 rounded-sm overflow-hidden border border-border/50">
      <Image 
        src={flagPath} 
        alt={countryCode.toUpperCase()} 
        width={16} 
        height={16} 
        className="w-full h-full object-cover"
        onError={(e) => {
          // Fallback to globe icon if flag image fails to load
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          target.parentElement!.innerHTML = '<div class="size-4 flex items-center justify-center"><span class="text-xs font-bold text-muted-foreground">' + countryCode.toUpperCase() + '</span></div>'
        }}
      />
    </div>
  )
}

// Функция для получения иконки типа ноды
const getNodeTypeIcon = (nodeType: string | undefined) => {
  switch (nodeType) {
    case 'MINECRAFT':
      return <div className="size-3 bg-green-500 rounded-full" />
    case 'CODING':
      return <div className="size-3 bg-blue-500 rounded-full" />
    default:
      return <div className="size-3 bg-gray-500 rounded-full" />
  }
}

export function NodeSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Выберите локацию", 
  className, 
  disabled,
  showPrices = true,
  filterByType
}: NodeSelectProps) {
  const filteredOptions = filterByType 
    ? options.filter(node => node.nodeType === filterByType)
    : options

  const selectOptions = filteredOptions
    .filter(node => node.isActive !== false)
    .map(node => {
      const location = node.locationName || 'Неизвестно'
      const serverCount = node._count?.servers || 0
      const priceText = showPrices && node.priceModifier 
        ? node.priceModifier > 0 
          ? `+${node.priceModifier} ₽` 
          : `${node.priceModifier} ₽`
        : node.isFree 
          ? 'Бесплатно' 
          : ''

      const sublabelParts = [
        location,
        `${serverCount} серверов`,
        priceText
      ].filter(Boolean)

      return {
        value: node.id,
        label: node.name,
        sublabel: sublabelParts.join(' • '),
        icon: (
          <div className="flex items-center gap-1">
            {getCountryFlag(node.countryCode)}
            {getNodeTypeIcon(node.nodeType)}
          </div>
        ),
        group: node.countryCode ? node.countryCode.toUpperCase() : 'Другие',
        disabled: !node.isActive
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