"use client"

import { 
  Users, Server, CreditCard, Wallet, Zap, Globe, Shield, RefreshCw, AlertCircle
} from "lucide-react"

interface User {
  id: string
  email: string
  name: string | null
  balance: number
  role: string
  pterodactylId: number | null
  createdAt: string
  _count: { servers: number; transactions: number }
}

interface Plan {
  id: string
  name: string
  isActive: boolean
  price: number
  _count: { servers: number }
}

interface ServerData {
  id: string
  name: string
  status: string
  plan: { id: string; name: string; price: number }
}

interface Egg {
  id: string
  name: string
  isActive: boolean
}

interface Node {
  id: string
  name: string
  isActive: boolean
}

interface AdminStatsCardsProps {
  users: User[]
  servers: ServerData[]
  plans: Plan[]
  eggs: Egg[]
  nodes: Node[]
  pterodactylConnected: boolean | null
  onRefresh: () => void
}

interface CircularProgressProps {
  value: number
  max: number
  color: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}

function CircularProgress({ value, max, color, icon: Icon, label }: CircularProgressProps) {
  const percentage = Math.min((value / max) * 100, 100)
  const circumference = 339.29 // 2 * PI * 54
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`
  
  return (
    <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center justify-center">
      <div className="relative size-40 mb-3">
        <svg className="size-full transform -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
          <circle 
            cx="60" 
            cy="60" 
            r="54" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="6" 
            strokeDasharray={strokeDasharray}
            className={`${color} transition-all duration-500`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className={`size-5 ${color} mb-1`} />
          <p className="text-2xl font-black text-foreground">{value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}</p>
          <p className={`text-xs font-bold ${color}`}>{Math.round(percentage)}%</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
}

function StatCard({ title, value, subtitle, icon: Icon, iconColor }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium">{title}</span>
        <Icon className={`size-4 ${iconColor}`} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </div>
  )
}

interface StatusCardProps {
  title: string
  value: string | number | React.ReactNode
  icon: React.ComponentType<{ className?: string }>
}

function StatusCard({ title, value, icon: Icon }: StatusCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{title}</span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      {typeof value === 'string' || typeof value === 'number' ? (
        <p className="text-xl font-bold text-foreground">{value}</p>
      ) : (
        value
      )}
    </div>
  )
}

export function AdminStatsCards({ 
  users, 
  servers, 
  plans, 
  eggs, 
  nodes, 
  pterodactylConnected,
  onRefresh 
}: AdminStatsCardsProps) {
  const activeServers = servers.filter(s => s.status !== 'DELETED').length
  const totalRevenue = servers.filter(s => s.status === 'ACTIVE').reduce((acc, s) => acc + s.plan.price, 0)
  const activePlans = plans.filter(p => p.isActive).length
  const activeEggs = eggs.filter(e => e.isActive).length
  const activeNodes = nodes.filter(n => n.isActive).length
  const payingUsers = users.filter(u => u._count.servers > 0).length
  const activeServerCount = servers.filter(s => s.status === 'ACTIVE').length
  const pendingServers = servers.filter(s => s.status === 'PENDING' || s.status === 'INSTALLING').length
  const suspendedServers = servers.filter(s => s.status === 'SUSPENDED').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Обзор</h1>
          <p className="text-muted-foreground">Пользователи • Серверы • Тарифы • Ежемесячно</p>
        </div>
        <button 
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-foreground hover:bg-accent/80 transition-colors"
        >
          <RefreshCw className="size-4" />
          Обновить
        </button>
      </div>

      {/* Main circular stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <CircularProgress 
          value={users.length} 
          max={1000} 
          color="text-blue-500" 
          icon={Users} 
          label="пользователей" 
        />
        <CircularProgress 
          value={activeServers} 
          max={500} 
          color="text-emerald-500" 
          icon={Server} 
          label="серверов" 
        />
        <CircularProgress 
          value={activePlans} 
          max={50} 
          color="text-violet-500" 
          icon={CreditCard} 
          label="тарифов" 
        />
        <CircularProgress 
          value={totalRevenue} 
          max={100000} 
          color="text-amber-500" 
          icon={Wallet} 
          label="ежемесячно" 
        />
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <StatCard 
          title="Платящих клиентов" 
          value={payingUsers} 
          subtitle={`${users.length > 0 ? Math.round((payingUsers / users.length) * 100) : 0}% от всех`}
          icon={Users}
          iconColor="text-blue-500"
        />
        <StatCard 
          title="Всего выручка" 
          value={`${(totalRevenue * 12).toLocaleString()} ₽`} 
          subtitle="в год"
          icon={Wallet}
          iconColor="text-amber-500"
        />
        <StatCard 
          title="Активных серверов" 
          value={activeServerCount} 
          subtitle={`${servers.filter(s => s.status !== 'DELETED').length > 0 ? Math.round((activeServerCount / servers.filter(s => s.status !== 'DELETED').length) * 100) : 0}% активных`}
          icon={Server}
          iconColor="text-emerald-500"
        />
        <StatCard 
          title="Средний тариф" 
          value={`${activeServerCount > 0 ? Math.round(totalRevenue / activeServerCount) : 0} ₽`} 
          subtitle="в месяц"
          icon={CreditCard}
          iconColor="text-violet-500"
        />
        <StatCard 
          title="Ядра" 
          value={activeEggs} 
          subtitle={`активных / ${eggs.length}`}
          icon={Zap}
          iconColor="text-yellow-500"
        />
        <StatCard 
          title="Ноды" 
          value={activeNodes} 
          subtitle={`активных / ${nodes.length}`}
          icon={Globe}
          iconColor="text-cyan-500"
        />
      </div>

      {/* Status cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard 
          title="Pterodactyl" 
          icon={Shield}
          value={
            <div className="flex items-center gap-2">
              <div className={`size-2 rounded-full ${pterodactylConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="text-sm text-foreground">{pterodactylConnected ? 'Подключено' : 'Отключено'}</span>
            </div>
          }
        />
        <StatusCard 
          title="Ожидающих серверов" 
          value={pendingServers}
          icon={RefreshCw}
        />
        <StatusCard 
          title="Приостановленных" 
          value={suspendedServers}
          icon={AlertCircle}
        />
      </div>
    </div>
  )
}
