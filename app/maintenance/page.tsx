"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Logo } from "@/components/logo"
import { Construction, ExternalLink, Sun, Moon, LayoutDashboard, Globe, Server } from "lucide-react"

const links = [
  { name: "Панель управления", url: "https://control.yourdomain.ru", icon: LayoutDashboard },
  { name: "Главный сайт", url: "https://yourdomain.ru", icon: Globe },
  { name: "VM Panel", url: "https://vm.yourdomain.ru", icon: Server },
]

const colors = [
  { name: "Amber", value: "amber", bg: "bg-amber-500", glow: "shadow-amber-500/50" },
  { name: "Red", value: "red", bg: "bg-red-500", glow: "shadow-red-500/50" },
  { name: "Blue", value: "blue", bg: "bg-blue-500", glow: "shadow-blue-500/50" },
  { name: "Green", value: "green", bg: "bg-emerald-500", glow: "shadow-emerald-500/50" },
  { name: "Purple", value: "purple", bg: "bg-violet-500", glow: "shadow-violet-500/50" },
  { name: "Pink", value: "pink", bg: "bg-pink-500", glow: "shadow-pink-500/50" },
]

const colorClasses: Record<string, { icon: string; text: string; border: string; bg: string }> = {
  amber: { icon: "text-amber-500", text: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/10" },
  red: { icon: "text-red-500", text: "text-red-400", border: "border-red-500/20", bg: "bg-red-500/10" },
  blue: { icon: "text-blue-500", text: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/10" },
  green: { icon: "text-emerald-500", text: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/10" },
  purple: { icon: "text-violet-500", text: "text-violet-400", border: "border-violet-500/20", bg: "bg-violet-500/10" },
  pink: { icon: "text-pink-500", text: "text-pink-400", border: "border-pink-500/20", bg: "bg-pink-500/10" },
}

export default function MaintenancePage() {
  const router = useRouter()
  const [activeColor, setActiveColor] = useState("amber")
  const [mounted, setMounted] = useState(false)
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(true)
  const { theme, setTheme } = useTheme()
  const colorTheme = colorClasses[activeColor]

  useEffect(() => {
    setMounted(true)
    
    const checkMaintenance = async () => {
      try {
        const res = await fetch('/api/settings/maintenance')
        if (res.ok) {
          const data = await res.json()
          if (!data.maintenanceMode) {
            document.cookie = 'maintenance-mode=false; path=/'
            router.push('/')
            return
          }
          setIsMaintenanceActive(true)
        }
      } catch (error) {
        console.error('Failed to check maintenance:', error)
      }
    }

    checkMaintenance()
    
    const interval = setInterval(checkMaintenance, 10000)
    return () => clearInterval(interval)
  }, [router])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Bottom controls */}
      <div className="fixed bottom-4 left-4 z-50">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-card/80 backdrop-blur-md border border-border shadow-lg">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme("light")}
            className={`p-2 rounded-lg transition-all ${
              mounted && theme === "light" 
                ? "bg-amber-100 text-amber-600" 
                : "text-slate-400 hover:text-slate-300 hover:bg-white/5"
            }`}
            title="Светлая тема"
          >
            <Sun className="size-5" />
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={`p-2 rounded-lg transition-all ${
              mounted && theme === "dark" 
                ? "bg-slate-700 text-blue-300" 
                : "text-slate-400 hover:text-slate-600 hover:bg-black/5"
            }`}
            title="Тёмная тема"
          >
            <Moon className="size-5" />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-border mx-1" />

          {/* Color picker */}
          {colors.map((color) => (
            <button
              key={color.value}
              onClick={() => setActiveColor(color.value)}
              className={`size-6 rounded-full ${color.bg} transition-all hover:scale-110 ${
                activeColor === color.value ? `ring-2 ring-offset-2 ring-offset-background ring-white shadow-lg ${color.glow}` : ""
              }`}
              title={color.name}
            />
          ))}
        </div>
      </div>

      <div className="max-w-md w-full text-center relative z-10">
        <div className="mb-8 flex justify-center">
          <div className={`size-20 rounded-2xl ${colorTheme.bg} flex items-center justify-center transition-colors duration-300`}>
            <Construction className={`size-10 ${colorTheme.icon} transition-colors duration-300`} />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          <Logo className="size-8 text-foreground" />
          <span className="font-heading text-2xl font-bold text-foreground">Avelon</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          Технические работы
        </h1>
        
        <p className="text-muted-foreground mb-8">
          Мы проводим плановое обслуживание для улучшения качества сервиса. 
          Пожалуйста, попробуйте позже.
        </p>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground mb-2">Полезные ссылки:</p>
          {links.map((link) => {
            const Icon = link.icon
            return (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-between p-3 rounded-xl bg-card border ${colorTheme.border} hover:${colorTheme.bg} transition-all group`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`size-4 ${colorTheme.icon} transition-colors duration-300`} />
                  <span className="text-sm text-foreground">{link.name}</span>
                </div>
                <ExternalLink className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </a>
            )
          })}
        </div>

        <p className={`mt-8 text-xs ${colorTheme.text} transition-colors duration-300`}>
          Приносим извинения за временные неудобства
        </p>
      </div>
    </div>
  )
}
