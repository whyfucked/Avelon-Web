"use client"

import { useState } from 'react'
import { CustomSelect } from "@/components/admin/custom-select"
import { MemoryStick, HardDrive, Cpu } from "lucide-react"

interface SizeInputProps {
  value: number
  onChange: (value: number) => void
  type: 'ram' | 'disk' | 'cpu'
  className?: string
  disabled?: boolean
}

const ramPresets = [
  { value: 128, label: '128 MB' },
  { value: 256, label: '256 MB' },
  { value: 512, label: '512 MB' },
  { value: 1024, label: '1 GB' },
  { value: 2048, label: '2 GB' },
  { value: 4096, label: '4 GB' },
  { value: 8192, label: '8 GB' },
  { value: 16384, label: '16 GB' },
  { value: 32768, label: '32 GB' },
]

const diskPresets = [
  { value: 1024, label: '1 GB' },
  { value: 2048, label: '2 GB' },
  { value: 5120, label: '5 GB' },
  { value: 10240, label: '10 GB' },
  { value: 20480, label: '20 GB' },
  { value: 51200, label: '50 GB' },
  { value: 102400, label: '100 GB' },
  { value: 204800, label: '200 GB' },
  { value: 512000, label: '500 GB' },
]

const cpuPresets = [
  { value: 25, label: '25%' },
  { value: 50, label: '50%' },
  { value: 75, label: '75%' },
  { value: 100, label: '100%' },
  { value: 150, label: '150%' },
  { value: 200, label: '200%' },
  { value: 300, label: '300%' },
  { value: 400, label: '400%' },
]

export function SizeInput({ value, onChange, type, className, disabled }: SizeInputProps) {
  const [isCustom, setIsCustom] = useState(false)
  const [customValue, setCustomValue] = useState(value.toString())

  const presets = type === 'ram' ? ramPresets : type === 'disk' ? diskPresets : cpuPresets
  const icon = type === 'ram' ? <MemoryStick className="size-4 text-blue-500" /> : 
               type === 'disk' ? <HardDrive className="size-4 text-purple-500" /> : 
               <Cpu className="size-4 text-green-500" />

  const currentPreset = presets.find(p => p.value === value)
  const isPresetValue = !!currentPreset

  const options = [
    ...presets.map(preset => ({
      value: preset.value.toString(),
      label: preset.label,
      icon
    })),
    {
      value: 'custom',
      label: 'Другое значение',
      icon: <div className="size-4 bg-gray-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">?</div>
    }
  ]

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === 'custom') {
      setIsCustom(true)
    } else {
      setIsCustom(false)
      onChange(parseInt(selectedValue))
    }
  }

  const handleCustomSubmit = () => {
    const numValue = parseInt(customValue)
    if (!isNaN(numValue) && numValue > 0) {
      onChange(numValue)
      setIsCustom(false)
    }
  }

  if (isCustom) {
    return (
      <div className={`flex gap-2 ${className}`}>
        <input
          type="number"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          placeholder={`Введите ${type === 'ram' ? 'MB' : type === 'disk' ? 'MB' : '%'}`}
          className="flex-1 px-3 py-2 rounded-lg bg-accent border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          disabled={disabled}
          min="1"
        />
        <button
          type="button"
          onClick={handleCustomSubmit}
          className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
          disabled={disabled}
        >
          ✓
        </button>
        <button
          type="button"
          onClick={() => setIsCustom(false)}
          className="px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors"
          disabled={disabled}
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <CustomSelect
      options={options}
      value={isPresetValue ? value.toString() : 'custom'}
      onChange={handleSelectChange}
      placeholder={`Выберите ${type === 'ram' ? 'RAM' : type === 'disk' ? 'диск' : 'CPU'}`}
      className={className}
      disabled={disabled}
      searchable={false}
    />
  )
}