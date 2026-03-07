"use client"

import Link from "next/link"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { 
  Settings, Users, Server, CreditCard, Database, 
  Home, Search, Activity, Cloud, Mail, LogOut, FileText,
  HardDrive, Globe, Box
} from "lucide-react"

export type Tab = "dashboard" | "users" | "servers" | "plans" | "pterodactyl" | "vmmanager" | "dedicated" | "domains" | "storagebox" | "status" | "smtp" | "logs" | "settings"

interface NavItem {
  id: Tab
  icon: React.ComponentType<{ className?: string }>
  label: string
}

interface AdminHeaderProps {
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export const navItems: NavItem[] = [
  { id: "dashboard", icon: Home, label: "Обзор" },
  { id: "users", icon: Users, label: "Пользователи" },
  { id: "servers", icon: Server, label: "Серверы" },
  { id: "plans", icon: CreditCard, label: "Тарифы" },
  { id: "pterodactyl", icon: Database, label: "Pterodactyl" },
  { id: "vmmanager", icon: Cloud, label: "VmManager" },
  { id: "dedicated", icon: HardDrive, label: "Дедики" },
  { id: "domains", icon: Globe, label: "Домены" },
  { id: "storagebox", icon: Box, label: "StorageBox" },
  { id: "status", icon: Activity, label: "Статус" },
  { id: "smtp", icon: Mail, label: "SMTP" },
  { id: "logs", icon: FileText, label: "Логи" },
  { id: "settings", icon: Settings, label: "Настройки" },
]

export function AdminHeader({ activeTab, setActiveTab, searchQuery, setSearchQuery }: AdminHeaderProps) {
  return (
    <nav className="fixed top-4 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-2xl border border-border bg-background/80 px-2 py-2 shadow-lg backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 px-3">
          <Logo className="size-6 text-foreground" />
          <span className="font-heading font-bold text-foreground hidden sm:block">Avelon</span>
        </Link>
        
        <div className="h-6 w-px bg-border mx-1" />
        
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition-colors ${
              activeTab === item.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <item.icon className="size-4" />
            <span className="hidden md:block">{item.label}</span>
          </button>
        ))}
        
        <div className="h-6 w-px bg-border mx-1" />
        
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-32 md:w-48 pl-9 pr-3 py-2 rounded-xl bg-accent/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-accent"
          />
        </div>
        
        <ThemeToggle />
        
        <Link href="/client" className="size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
          <LogOut className="size-4" />
        </Link>
      </div>
    </nav>
  )
}
