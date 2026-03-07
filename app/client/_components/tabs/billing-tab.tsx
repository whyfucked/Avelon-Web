"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { User, ServerData } from "../types"
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, Zap, Receipt, CreditCard, Bitcoin } from "lucide-react"
import Image from "next/image"

interface Transaction {
  id: string
  type: string
  amount: number
  description: string
  createdAt: string
}

interface BillingTabProps {
  user: User
  servers: ServerData[]
}

export function BillingTab({ user, servers }: BillingTabProps) {
  const router = useRouter()
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [page, setPage] = useState(1)

  const monthlyExpenses = servers.reduce((acc, s) => acc + s.plan.price, 0)
  const daysRemaining = monthlyExpenses > 0 ? Math.floor(user.balance / (monthlyExpenses / 30)) : Infinity

  useEffect(() => {
    fetch("/api/user/transactions").then(r => r.json()).then(d => setTransactions(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const handlePayment = () => {
    const amount = selectedAmount || parseInt(customAmount) || 0
    if (amount >= 10) router.push(`/payments?amount=${amount}`)
  }

  const amounts = [100, 250, 500, 1000]
  const perPage = 5
  const totalPages = Math.ceil(transactions.length / perPage)
  const paginatedTx = transactions.slice((page - 1) * perPage, page * perPage)

  return (
    <div className="max-w-5xl mx-auto pb-8">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden mb-6 border border-border/50 bg-card/30 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="absolute inset-0" style={{ backgroundImage: 'url(/pay.jpg)', backgroundPosition: 'center', backgroundSize: 'cover' }} />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/60 text-xs mb-1">Текущий баланс</p>
              <h1 className="font-heading text-3xl font-bold text-white tabular-nums transition-all duration-300">{user.balance.toFixed(0)} ₽</h1>
              <p className="text-white/60 text-sm mt-1">
                {daysRemaining === Infinity ? "Нет активных серверов" : `Хватит на ~${daysRemaining} дней`}
              </p>
            </div>
            <div className="size-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Wallet className="size-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Пополнение */}
        <div className="rounded-2xl border border-border/50 bg-card/30 p-6 animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          <div className="flex items-center gap-2 mb-4">
            <Plus className="size-4 text-muted-foreground" />
            <h2 className="font-heading font-semibold text-foreground">Пополнение</h2>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {amounts.map((amount) => (
              <button
                key={amount}
                onClick={() => { setSelectedAmount(amount); setCustomAmount("") }}
                className={`py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  selectedAmount === amount
                    ? "bg-foreground text-background scale-[1.02]"
                    : "border border-border/50 bg-card/50 text-foreground hover:border-foreground/30 hover:scale-[1.02]"
                }`}
              >
                {amount} ₽
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              value={customAmount}
              onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null) }}
              placeholder="Своя сумма (мин. 10₽)"
              className="flex-1 px-4 py-3 rounded-xl border border-border/50 bg-card/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 transition-all duration-200"
            />
            <button
              onClick={handlePayment}
              disabled={!selectedAmount && (!customAmount || parseInt(customAmount) < 10)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 disabled:opacity-50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Zap className="size-4" />
              Оплатить
            </button>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <CreditCard className="size-5 text-muted-foreground" />
            <Image src="/sbp.png" alt="СБП" width={20} height={20} className="rounded" />
            <Bitcoin className="size-5 text-muted-foreground" />
          </div>
        </div>

        {/* История */}
        <div className="rounded-2xl border border-border/50 bg-card/30 p-6 animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="size-4 text-muted-foreground" />
            <h2 className="font-heading font-semibold text-foreground">История</h2>
            {transactions.length > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">{transactions.length}</span>
            )}
          </div>

          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Операций пока нет</p>
          ) : (
            <>
              <div className="space-y-2">
                {paginatedTx.map((tx, index) => (
                  <div 
                    key={tx.id} 
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-all duration-200 animate-in fade-in slide-in-from-right-2"
                    style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                  >
                    <div className={`size-8 rounded-lg flex items-center justify-center ${tx.amount > 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      {tx.amount > 0 ? <ArrowUpRight className="size-4 text-emerald-500" /> : <ArrowDownRight className="size-4 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <p className={`text-sm font-medium tabular-nums ${tx.amount > 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount} ₽
                    </p>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center gap-1 mt-4 pt-4 border-t border-border/30">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`size-8 rounded-lg text-xs font-medium transition-all duration-200 ${page === i + 1 ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/40"}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
