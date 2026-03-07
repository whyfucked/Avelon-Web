"use client"

import { CreditCard, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react"

interface Transaction {
  id: string
  amount: number
  type: 'DEPOSIT' | 'PAYMENT' | 'REFUND'
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  description: string | null
  createdAt: string
  user: { id: string; email: string; name: string | null }
}

interface AdminPaymentsTableProps {
  transactions: Transaction[]
  searchQuery: string
  onRefresh: () => void
}

const statusColors: Record<string, string> = { 
  PENDING: 'bg-amber-500/20 text-amber-500', 
  COMPLETED: 'bg-emerald-500/20 text-emerald-500', 
  FAILED: 'bg-red-500/20 text-red-500',
}

const statusLabels: Record<string, string> = {
  PENDING: 'Ожидание',
  COMPLETED: 'Завершено',
  FAILED: 'Ошибка',
}

const typeLabels: Record<string, string> = {
  DEPOSIT: 'Пополнение',
  PAYMENT: 'Оплата',
  REFUND: 'Возврат',
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'COMPLETED': return <CheckCircle className="size-4 text-emerald-500" />
    case 'FAILED': return <XCircle className="size-4 text-red-500" />
    default: return <Clock className="size-4 text-amber-500" />
  }
}

export function AdminPaymentsTable({ 
  transactions, 
  searchQuery, 
  onRefresh 
}: AdminPaymentsTableProps) {
  const filteredTransactions = transactions.filter(t => 
    !searchQuery || 
    t.user.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalDeposits = transactions
    .filter(t => t.type === 'DEPOSIT' && t.status === 'COMPLETED')
    .reduce((acc, t) => acc + t.amount, 0)

  const totalPayments = transactions
    .filter(t => t.type === 'PAYMENT' && t.status === 'COMPLETED')
    .reduce((acc, t) => acc + t.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">{transactions.length} платежей</h1>
          <p className="text-sm text-muted-foreground">
            Пополнений: {totalDeposits.toLocaleString()} ₽ • Оплат: {totalPayments.toLocaleString()} ₽
          </p>
        </div>
        <button 
          onClick={onRefresh} 
          className="size-9 rounded-xl bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Всего пополнений</span>
            <CreditCard className="size-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalDeposits.toLocaleString()} ₽</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Всего оплат</span>
            <CreditCard className="size-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalPayments.toLocaleString()} ₽</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Ожидающих</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {transactions.filter(t => t.status === 'PENDING').length}
          </p>
        </div>
      </div>
      
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-accent/30">
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Дата</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Пользователь</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Тип</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Сумма</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Описание</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredTransactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-accent/20 transition-colors">
                <td className="px-5 py-3 text-sm text-muted-foreground">
                  {new Date(transaction.createdAt).toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>
                <td className="px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{transaction.user.name || transaction.user.email}</p>
                    <p className="text-xs text-muted-foreground">{transaction.user.email}</p>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${
                    transaction.type === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-500' :
                    transaction.type === 'REFUND' ? 'bg-amber-500/20 text-amber-500' :
                    'bg-blue-500/20 text-blue-500'
                  }`}>
                    {typeLabels[transaction.type] || transaction.type}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-sm font-medium ${
                    transaction.type === 'DEPOSIT' || transaction.type === 'REFUND' 
                      ? 'text-emerald-500' 
                      : 'text-foreground'
                  }`}>
                    {transaction.type === 'DEPOSIT' || transaction.type === 'REFUND' ? '+' : '-'}
                    {transaction.amount.toLocaleString()} ₽
                  </span>
                </td>
                <td className="px-5 py-3 text-sm text-muted-foreground max-w-xs truncate">
                  {transaction.description || '—'}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={transaction.status} />
                    <span className={`text-xs px-2.5 py-1 rounded-full ${statusColors[transaction.status]}`}>
                      {statusLabels[transaction.status] || transaction.status}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredTransactions.length === 0 && (
          <div className="px-5 py-12 text-center text-muted-foreground">
            <CreditCard className="size-12 mx-auto mb-3 opacity-50" />
            <p>Платежи не найдены</p>
          </div>
        )}
      </div>
    </div>
  )
}
