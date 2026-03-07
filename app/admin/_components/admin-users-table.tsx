"use client"

import { useState } from "react"
import { 
  Users, Server, Database, Wallet, Shield, 
  Edit, Trash2, RefreshCw, Search, Save, X, Eye, EyeOff, CheckCircle, XCircle
} from "lucide-react"
import { notify } from "@/lib/notify"

interface User {
  id: string
  email: string
  name: string | null
  balance: number
  role: string
  pterodactylId: number | null
  emailVerified: boolean
  createdAt: string
  _count: { servers: number; transactions: number }
}

interface AdminUsersTableProps {
  users: User[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  onRefresh: () => void
  onDeleteUser: (userId: string) => void
  onVerifyUser: (userId: string) => void
  onSaveUser: (userId: string, data: { name?: string; email?: string; password?: string; balance?: number; role?: string; emailVerified?: boolean }) => Promise<void>
}

export function AdminUsersTable({ 
  users, 
  searchQuery, 
  setSearchQuery, 
  onRefresh, 
  onDeleteUser,
  onVerifyUser,
  onSaveUser 
}: AdminUsersTableProps) {
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editingUserForm, setEditingUserForm] = useState({ 
    name: '', 
    email: '', 
    newPassword: '', 
    balance: 0, 
    role: 'USER',
    emailVerified: false
  })
  const [showPassword, setShowPassword] = useState(false)

  const filteredUsers = users.filter(u => 
    !searchQuery || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleEditUserOpen = (user: User) => {
    setEditingUser(user)
    setEditingUserForm({ 
      name: user.name || '', 
      email: user.email, 
      newPassword: '', 
      balance: user.balance, 
      role: user.role,
      emailVerified: user.emailVerified
    })
  }

  const handleSaveUser = async () => {
    if (!editingUser) return
    
    const updateData: { name?: string; email?: string; password?: string; balance?: number; role?: string; emailVerified?: boolean } = {}
    if (editingUserForm.name !== editingUser.name) updateData.name = editingUserForm.name
    if (editingUserForm.email !== editingUser.email) updateData.email = editingUserForm.email
    if (editingUserForm.newPassword) updateData.password = editingUserForm.newPassword
    if (editingUserForm.balance !== editingUser.balance) updateData.balance = editingUserForm.balance
    if (editingUserForm.role !== editingUser.role) updateData.role = editingUserForm.role
    if (editingUserForm.emailVerified !== editingUser.emailVerified) updateData.emailVerified = editingUserForm.emailVerified
    
    if (Object.keys(updateData).length === 0) {
      notify.error('Нет изменений')
      return
    }
    
    await onSaveUser(editingUser.id, updateData)
    setEditingUser(null)
    setEditingUserForm({ name: '', email: '', newPassword: '', balance: 0, role: 'USER', emailVerified: false })
  }

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) password += chars.charAt(Math.floor(Math.random() * chars.length))
    return password
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">{filteredUsers.length} пользователей</h1>
          <p className="text-sm text-muted-foreground">Всего: {users.length}</p>
        </div>
        <button 
          onClick={() => { onRefresh(); notify.success('Список пользователей обновлён') }} 
          className="size-9 rounded-xl bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      <div className="relative">
        <Search className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Поиск по email или имени..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-accent/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-accent focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>
      
      <div className="space-y-2">
        {filteredUsers.map((user) => (
          <div key={user.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-primary/30 transition-all group">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="size-9 rounded-lg flex items-center justify-center text-muted-foreground flex-shrink-0 border border-border">
                {user.role === 'ADMIN' ? <Shield className="size-4 text-muted-foreground" /> : <Users className="size-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.name || user.email}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 mx-4 text-xs text-muted-foreground flex-shrink-0">
              <div className="flex items-center gap-1">
                <Wallet className="size-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">{user.balance.toFixed(2)} ₽</span>
              </div>
              <div className="flex items-center gap-1">
                <Server className="size-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">{user._count.servers}</span>
              </div>
              {user.pterodactylId && (
                <div className="flex items-center gap-1">
                  <Database className="size-3.5 text-muted-foreground" />
                  <span className="font-medium text-foreground">{user.pterodactylId}</span>
                </div>
              )}
              <div className="flex items-center gap-1" title={user.emailVerified ? "Email подтвержден" : "Email не подтвержден"}>
                {user.emailVerified ? (
                  <CheckCircle className="size-3.5 text-emerald-500" />
                ) : (
                  <XCircle className="size-3.5 text-red-500" />
                )}
              </div>
              <div>
                <span className={`text-xs px-2 py-1 rounded font-medium ${user.role === 'ADMIN' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                  {user.role}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button 
                onClick={() => handleEditUserOpen(user)} 
                className="size-8 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                title="Редактировать"
              >
                <Edit className="size-4" />
              </button>
              {!user.emailVerified && (
                <button 
                  onClick={() => onVerifyUser(user.id)} 
                  className="size-8 rounded-lg hover:bg-emerald-500/20 flex items-center justify-center text-muted-foreground hover:text-emerald-500 transition-all"
                  title="Верифицировать email"
                >
                  <CheckCircle className="size-4" />
                </button>
              )}
              <button 
                onClick={() => onDeleteUser(user.id)} 
                className="size-8 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-all"
                title="Удалить"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="rounded-2xl border border-border bg-card px-5 py-12 text-center text-muted-foreground">
          <Users className="size-12 mx-auto mb-3 opacity-50" />
          <p>Пользователи не найдены</p>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Редактировать пользователя</h2>
              <button 
                onClick={() => setEditingUser(null)} 
                className="size-8 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Имя</label>
                <input
                  type="text"
                  value={editingUserForm.name}
                  onChange={(e) => setEditingUserForm({ ...editingUserForm, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-accent/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Email</label>
                <input
                  type="email"
                  value={editingUserForm.email}
                  onChange={(e) => setEditingUserForm({ ...editingUserForm, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-accent/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Новый пароль</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={editingUserForm.newPassword}
                    onChange={(e) => setEditingUserForm({ ...editingUserForm, newPassword: e.target.value })}
                    placeholder="Оставьте пустым, чтобы не менять"
                    className="w-full px-4 py-2 pr-20 rounded-xl bg-accent/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="size-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUserForm({ ...editingUserForm, newPassword: generateRandomPassword() })}
                      className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      Gen
                    </button>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Баланс (₽)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingUserForm.balance}
                  onChange={(e) => setEditingUserForm({ ...editingUserForm, balance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 rounded-xl bg-accent/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Роль</label>
                <select
                  value={editingUserForm.role}
                  onChange={(e) => setEditingUserForm({ ...editingUserForm, role: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-accent/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Верификация Email</label>
                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-accent/50">
                  <input
                    type="checkbox"
                    id="emailVerified"
                    checked={editingUserForm.emailVerified}
                    onChange={(e) => setEditingUserForm({ ...editingUserForm, emailVerified: e.target.checked })}
                    className="size-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/50"
                  />
                  <label htmlFor="emailVerified" className="text-sm text-foreground cursor-pointer">
                    Email подтвержден
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 px-4 py-2 rounded-xl bg-accent text-foreground hover:bg-accent/80 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveUser}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                <Save className="size-4" />
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
