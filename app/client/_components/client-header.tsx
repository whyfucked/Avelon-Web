"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { Logo } from "@/components/logo"
import { Server, Plus, Settings, LogOut, Home, Wallet, Shield } from "lucide-react"
import { User } from "./types"

interface ClientHeaderProps {
  user: User
  onLogout: () => void
}

const navItems = [
  { href: "/client", icon: Home, label: "Главная", exact: true },
  { href: "/client/servers", icon: Server, label: "Серверы" },
  { href: "/client/create", icon: Plus, label: "Создать" },
  { href: "/client/billing", icon: Wallet, label: "Баланс" },
  { href: "/client/settings", icon: Settings, label: "Настройки" },
]

export function ClientHeader({ user, onLogout }: ClientHeaderProps) {
  const pathname = usePathname()

  return (
    <nav className="fixed top-4 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-6 rounded-2xl border border-border bg-background/80 py-2 px-6 shadow-lg backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 hover:scale-105 transition-transform duration-200">
          <Logo className="size-7 text-foreground" />
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">Avelon</span>
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition-all duration-200 hover:scale-[1.02] ${
                  isActive
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Разделитель */}
        <div className="h-6 w-px bg-border/60" />

        <ThemeToggle />

        <div className="h-6 w-px bg-border/60" />

        <Link
          href="/client/billing"
          className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Wallet className="size-4" />
          <span className="font-heading font-bold whitespace-nowrap">{user.balance.toFixed(0)} ₽</span>
        </Link>

        {user.role === "ADMIN" && (
          <>
            <div className="h-6 w-px bg-border/60" />
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-all duration-200 hover:from-amber-500/20 hover:to-orange-500/20 hover:scale-[1.02] active:scale-[0.98]"
              title="Админ панель"
            >
              <Shield className="size-4" />
              <span className="font-medium">Админ</span>
            </Link>
          </>
        )}

        <div className="h-6 w-px bg-border/60" />

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium bg-red-500/10 text-red-500 transition-all duration-200 hover:bg-red-500/20 hover:scale-[1.02] active:scale-[0.98]"
          title="Выйти"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </nav>
  )
}
