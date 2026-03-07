"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { AuthModal } from "@/components/auth-modal"
import { Logo } from "@/components/logo"
import { FileText, LogIn, HelpCircle, Wallet, Shield, ChevronDown, Server, Code, Cloud } from "lucide-react"

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}

interface UserData {
  id: string
  email: string
  name: string | null
  balance: number
  role: string
}

const services = [
  { name: "Minecraft", icon: Server, href: "/#pricing?type=game", type: "game" },
  { name: "Coding", icon: Code, href: "/#pricing?type=coding", type: "coding" },
  { name: "VDS", icon: Cloud, href: "/#pricing?type=vds", type: "vds" },
]

export function Navbar() {
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [authDisabled, setAuthDisabled] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const servicesRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (servicesRef.current && !servicesRef.current.contains(event.target as Node)) {
        setServicesOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (data.user?.id === 'public') {
          setAuthDisabled(true)
          setUser(null)
        } else {
          setUser(data.user)
        }
      }
    } catch {}
    setAuthChecked(true)
  }

  const handleAuthSuccess = () => {
    checkAuth()
    router.push('/client')
  }

  const handleServiceClick = (type: string) => {
    setServicesOpen(false)
    const pricingSection = document.getElementById('pricing')
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' })
      window.dispatchEvent(new CustomEvent('setPricingType', { detail: type }))
    } else {
      router.push(`/#pricing?type=${type}`)
    }
  }

  return (
    <>
      <nav className="fixed top-2 sm:top-4 left-1/2 z-50 -translate-x-1/2 w-[calc(100%-1rem)] sm:w-auto max-w-[calc(100%-1rem)] animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-2 sm:gap-6 rounded-xl sm:rounded-2xl border border-border bg-background/80 py-1.5 sm:py-2 px-3 sm:px-6 shadow-lg backdrop-blur-md">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 hover:scale-105 transition-transform duration-200">
            <Logo className="size-5 sm:size-7 text-foreground" />
            <span className="font-heading text-sm sm:text-lg font-bold tracking-tight text-foreground">Avelon</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <Link
              href="/docs"
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground hover:scale-[1.02]"
            >
              <FileText className="size-4" />
              Документация
            </Link>
            <div ref={servicesRef} className="relative">
              <button
                onClick={() => setServicesOpen(!servicesOpen)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground hover:scale-[1.02]"
              >
                <Server className="size-4" />
                Услуги
                <ChevronDown className={`size-3 transition-transform duration-200 ${servicesOpen ? "rotate-180" : ""}`} />
              </button>
              {servicesOpen && (
                <div className="absolute left-0 top-full mt-4 w-40 rounded-xl border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                  {services.map((service, index) => (
                    <button
                      key={service.type}
                      onClick={() => handleServiceClick(service.type)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground hover:scale-[1.02]"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <service.icon className="size-4" />
                      {service.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <a
              href="https://dsc.gg/avelonmy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground hover:scale-[1.02]"
            >
              <DiscordIcon className="size-4" />
              Поддержка
            </a>
            <Link
              href="/#faq"
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground hover:scale-[1.02]"
            >
              <HelpCircle className="size-4" />
              FAQ
            </Link>
          </div>

          {/* Разделитель */}
          <div className="h-6 w-px bg-border/60" />

          <ThemeToggle />

          {user?.role === 'ADMIN' && (
            <>
              <div className="h-6 w-px bg-border/60 hidden sm:block" />
              <Link 
                href="/admin"
                className="flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-all duration-200 hover:bg-amber-500/20 hover:scale-[1.02]"
                title="Админ панель"
              >
                <Shield className="size-3.5 sm:size-4" />
                <span className="hidden lg:inline">Админ</span>
              </Link>
            </>
          )}

          <div className="h-6 w-px bg-border/60" />

          {user ? (
            <Link 
              href="/client"
              className="flex items-center gap-1 sm:gap-1.5 rounded-lg bg-foreground px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-background transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Wallet className="size-3.5 sm:size-4" />
              <span className={`font-heading font-bold transition-opacity whitespace-nowrap ${authChecked ? "opacity-100" : "opacity-0"}`}>{user.balance.toFixed(0)} ₽</span>
            </Link>
          ) : (
            <button 
              onClick={() => {
                if (!authDisabled) {
                  setIsAuthOpen(true)
                }
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                authDisabled
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-foreground text-background hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              <LogIn className="size-4" />
              <span className="hidden sm:inline">
                {authDisabled ? "Авторизация выключена" : "Войти"}
              </span>
            </button>
          )}
        </div>
      </nav>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onSuccess={handleAuthSuccess}
      />
    </>
  )
}
