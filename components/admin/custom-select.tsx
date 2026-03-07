"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, Search, X } from "lucide-react"

interface Option {
  value: string
  label: string
  sublabel?: string
  icon?: React.ReactNode
  disabled?: boolean
  group?: string
}

interface CustomSelectProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  searchable?: boolean
  clearable?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost' | 'outline'
}

export function CustomSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Выберите...", 
  className = "", 
  disabled = false,
  searchable = false,
  clearable = false,
  size = 'md',
  variant = 'default'
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearchQuery("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      searchRef.current.focus()
    }
  }, [isOpen, searchable])

  const selectedOption = options.find(o => o.value === value)
  
  const filteredOptions = searchQuery 
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        option.sublabel?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options

  // Группировка опций
  const groupedOptions = filteredOptions.reduce((acc, option) => {
    const group = option.group || 'default'
    if (!acc[group]) acc[group] = []
    acc[group].push(option)
    return acc
  }, {} as Record<string, Option[]>)

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base'
  }

  const variantClasses = {
    default: 'bg-accent border-border hover:border-foreground/20',
    ghost: 'bg-transparent border-transparent hover:bg-accent/50',
    outline: 'bg-background border-border hover:border-foreground/30'
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setIsOpen(false)
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border text-left transition-all ${
          sizeClasses[size]
        } ${
          disabled 
            ? "bg-muted border-border text-muted-foreground cursor-not-allowed opacity-50" 
            : `${variantClasses[variant]} text-foreground cursor-pointer`
        } ${isOpen ? "border-primary/50 ring-2 ring-primary/10" : ""}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedOption?.icon && (
            <div className="flex-shrink-0 text-muted-foreground">
              {selectedOption.icon}
            </div>
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <span className={`truncate ${selectedOption ? "text-foreground" : "text-muted-foreground"}`}>
              {selectedOption?.label || placeholder}
            </span>
            {selectedOption?.sublabel && (
              <span className="text-xs text-muted-foreground truncate">
                {selectedOption.sublabel}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {clearable && selectedOption && !disabled && (
            <span
              role="button"
              onClick={handleClear}
              className="p-0.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="size-3" />
            </span>
          )}
          <ChevronDown className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
          {searchable && (
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Поиск..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-accent/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                />
              </div>
            </div>
          )}
          
          <div className="max-h-64 overflow-y-auto py-1">
            {Object.keys(groupedOptions).length === 0 ? (
              <div className="px-4 py-8 text-sm text-muted-foreground text-center">
                <div className="size-12 mx-auto mb-3 rounded-full bg-muted/30 flex items-center justify-center">
                  <Search className="size-5 text-muted-foreground" />
                </div>
                {searchQuery ? 'Ничего не найдено' : 'Нет вариантов'}
              </div>
            ) : (
              Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
                <div key={groupName}>
                  {groupName !== 'default' && (
                    <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50">
                      {groupName}
                    </div>
                  )}
                  {groupOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        if (!option.disabled) {
                          onChange(option.value)
                          setIsOpen(false)
                          setSearchQuery("")
                        }
                      }}
                      disabled={option.disabled}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        option.disabled 
                          ? "opacity-50 cursor-not-allowed" 
                          : "hover:bg-accent/50 cursor-pointer"
                      } ${
                        value === option.value ? "bg-primary/10 border-r-2 border-primary" : ""
                      }`}
                    >
                      {option.icon && (
                        <div className="flex-shrink-0 text-muted-foreground">
                          {option.icon}
                        </div>
                      )}
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className={`text-sm truncate ${
                          value === option.value ? "text-primary font-medium" : "text-foreground"
                        }`}>
                          {option.label}
                        </span>
                        {option.sublabel && (
                          <span className="text-xs text-muted-foreground truncate">
                            {option.sublabel}
                          </span>
                        )}
                      </div>
                      {value === option.value && (
                        <Check className="size-4 text-primary flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
