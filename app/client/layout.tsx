"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { notify } from "@/lib/notify"
import { Footer } from "@/components/footer"
import { Loader2 } from "lucide-react"
import { User, ServerData, Plan, Node, VdsServer, VdsPlan } from "./_components/types"
import { DecorativeLines } from "./_components/decorative-lines"
import { ClientHeader } from "./_components/client-header"
import { DeleteServerModal } from "./_components/modals/delete-server-modal"
import { PasswordModal } from "./_components/modals/password-modal"
import { DeleteAccountModal } from "./_components/modals/delete-account-modal"

interface PteroAccount {
  linked: boolean
  username?: string
  email?: string
}

interface ClientContextType {
  user: User
  servers: ServerData[]
  vdsServers: VdsServer[]
  plans: Plan[]
  vdsPlans: VdsPlan[]
  nodes: Node[]
  loadingServers: boolean
  loadingVds: boolean
  loadingPlans: boolean
  loadingVdsPlans: boolean
  creating: boolean
  createError: string | null
  expandedServerId: string | null
  setExpandedServerId: (id: string | null) => void
  onCreateServer: (planId: string, nodeId: string, name: string, eggId: string | null, promoCode: string | null) => Promise<void>
  onDeleteClick: (server: ServerData) => void
  onRenewServer: (serverId: string) => Promise<void>
  renewingServerId: string | null
  pteroAccount: PteroAccount | null
  pteroLoading: boolean
  pteroPassword: string | null
  showPteroPassword: boolean
  setShowPteroPassword: (show: boolean) => void
  onCreatePteroAccount: () => void
  onResetPteroPassword: () => void
  onShowPasswordModal: () => void
  onCopyToClipboard: (text: string) => void
  onShowDeleteAccountModal: () => void
  loadVdsServers: () => Promise<void>
  osImages: Array<{ vmManagerId: number; name: string }>
  onReinstallVds: (hostId: number, osId: number, password: string) => Promise<void>
  reinstallingVdsId: number | null
  onRenewVds: (hostId: number) => Promise<void>
  renewingVdsId: number | null
  onResendVerification: () => Promise<void>
  verificationLoading: boolean
}

const ClientContext = createContext<ClientContextType | null>(null)

export function useClientContext() {
  const ctx = useContext(ClientContext)
  if (!ctx) throw new Error("useClientContext must be used within ClientLayout")
  return ctx
}

export default function ClientLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  
  const [servers, setServers] = useState<ServerData[]>([])
  const [vdsServers, setVdsServers] = useState<VdsServer[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [vdsPlans, setVdsPlans] = useState<VdsPlan[]>([])
  const [nodes, setNodes] = useState<Node[]>([])
  const [loadingServers, setLoadingServers] = useState(true)
  const [loadingVds, setLoadingVds] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [loadingVdsPlans, setLoadingVdsPlans] = useState(true)
  
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  
  const [pteroAccount, setPteroAccount] = useState<PteroAccount | null>(null)
  const [pteroLoading, setPteroLoading] = useState(false)
  const [pteroPassword, setPteroPassword] = useState<string | null>(null)
  const [showPteroPassword, setShowPteroPassword] = useState(false)
  
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  
  const [selectedServer, setSelectedServer] = useState<ServerData | null>(null)
  const [expandedServerId, setExpandedServerId] = useState<string | null>(null)
  const [deletingServer, setDeletingServer] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)
  const [deleteAccountStep, setDeleteAccountStep] = useState<1 | 2>(1)
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('')
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false)
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null)
  
  const [renewingServerId, setRenewingServerId] = useState<string | null>(null)
  const [osImages, setOsImages] = useState<Array<{ vmManagerId: number; name: string }>>([])
  const [reinstallingVdsId, setReinstallingVdsId] = useState<number | null>(null)
  const [renewingVdsId, setRenewingVdsId] = useState<number | null>(null)
  const [verificationLoading, setVerificationLoading] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      loadServers()
      loadVdsServers()
      loadPlans()
      loadVdsPlans()
      loadNodes()
      loadPteroAccount()
      loadOsImages()
    }
  }, [user])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        router.push('/')
      }
    } catch {
      router.push('/')
    }
    setAuthLoading(false)
  }

  const loadServers = async () => {
    try {
      const res = await fetch('/api/servers')
      if (res.ok) {
        const data = await res.json()
        setServers(Array.isArray(data) ? data : [])
      }
    } catch {}
    setLoadingServers(false)
  }

  const loadVdsServers = async () => {
    try {
      const res = await fetch('/api/user/vds')
      if (res.ok) {
        const data = await res.json()
        setVdsServers(Array.isArray(data.servers) ? data.servers : [])
      }
    } catch {}
    setLoadingVds(false)
  }

  const loadPlans = async () => {
    try {
      const res = await fetch('/api/plans')
      if (res.ok) {
        const data = await res.json()
        setPlans(Array.isArray(data) ? data : [])
      }
    } catch {}
    setLoadingPlans(false)
  }

  const loadVdsPlans = async () => {
    try {
      const res = await fetch('/api/vds/plans')
      if (res.ok) {
        const data = await res.json()
        setVdsPlans(Array.isArray(data) ? data : [])
      }
    } catch {}
    setLoadingVdsPlans(false)
  }

  const loadNodes = async () => {
    try {
      const res = await fetch('/api/nodes')
      if (res.ok) {
        const data = await res.json()
        setNodes(Array.isArray(data) ? data : [])
      }
    } catch {}
  }

  const loadPteroAccount = async () => {
    try {
      const res = await fetch('/api/user/pterodactyl')
      if (res.ok) {
        const data = await res.json()
        setPteroAccount({
          linked: data.linked,
          username: data.pterodactyl?.username,
          email: data.pterodactyl?.email,
        })
      }
    } catch {}
  }

  const loadOsImages = async () => {
    try {
      const res = await fetch('/api/vds/os-images')
      if (res.ok) {
        const data = await res.json()
        setOsImages(Array.isArray(data) ? data.map((os: any) => ({ vmManagerId: os.vmManagerId, name: os.name })) : [])
      }
    } catch {}
  }

  const handleReinstallVds = async (hostId: number, osId: number, password: string) => {
    setReinstallingVdsId(hostId)
    try {
      const res = await fetch(`/api/user/vds/${hostId}/reinstall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ osId, password }),
      })
      const data = await res.json()
      
      if (res.ok) {
        notify.success(data.message || 'Переустановка ОС запущена')
        loadVdsServers()
      } else {
        notify.error(data.error || 'Ошибка переустановки')
      }
    } catch {
      notify.error('Ошибка сети')
    }
    setReinstallingVdsId(null)
  }

  const handleRenewVds = async (hostId: number) => {
    setRenewingVdsId(hostId)
    try {
      const res = await fetch(`/api/user/vds/${hostId}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      
      if (res.ok) {
        notify.success(data.message || 'VDS продлён на 30 дней')
        loadVdsServers()
        checkAuth() // Обновляем баланс
      } else {
        notify.error(data.error || 'Ошибка продления')
      }
    } catch {
      notify.error('Ошибка сети')
    }
    setRenewingVdsId(null)
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    notify.success('Вы вышли из аккаунта')
    router.push('/')
  }

  const handleCreateServer = async (planId: string, nodeId: string, name: string, eggId: string | null, promoCode: string | null = null) => {
    if (!user) return
    
    const selectedNodeData = nodes.find(n => n.id === nodeId)
    if (selectedNodeData?.hasAllocations === false) {
      setCreateError('Эта локация не настроена для создания серверов. Выберите другую локацию.')
      return
    }
    
    setCreating(true)
    setCreateError(null)
    
    try {
      const res = await fetch('/api/servers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, planId, nodeId, name, eggId, promoCode }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        router.push('/client')
        loadServers()
        checkAuth()
        notify.success('Сервер создан! Установка началась.')
      } else {
        setCreateError(data.error || 'Ошибка создания сервера')
        notify.error(data.error || 'Ошибка создания сервера')
      }
    } catch {
      setCreateError('Ошибка сети')
      notify.error('Ошибка сети')
    }
    
    setCreating(false)
  }

  const handleDeleteServer = async (serverId: string) => {
    setDeletingServer(true)
    try {
      const res = await fetch(`/api/servers/${serverId}`, { method: 'DELETE' })
      if (res.ok) {
        setSelectedServer(null)
        setShowDeleteConfirm(false)
        loadServers()
        checkAuth()
        notify.success('Сервер удалён, средства возвращены')
      } else {
        const data = await res.json()
        notify.error(data.error || 'Ошибка удаления')
      }
    } catch {
      notify.error('Ошибка сети')
    }
    setDeletingServer(false)
  }

  const handleRenewServer = async (serverId: string) => {
    setRenewingServerId(serverId)
    try {
      const res = await fetch('/api/servers/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId }),
      })
      const data = await res.json()
      
      if (res.ok) {
        loadServers()
        checkAuth()
        notify.success(data.message || 'Сервер продлён на 30 дней!')
      } else {
        notify.error(data.error || 'Ошибка продления')
      }
    } catch {
      notify.error('Ошибка сети')
    }
    setRenewingServerId(null)
  }

  const createPteroAccount = async () => {
    setPteroLoading(true)
    setPteroPassword(null)
    try {
      const res = await fetch('/api/user/pterodactyl', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setPteroAccount({
          linked: true,
          username: data.pterodactyl?.username,
          email: data.pterodactyl?.email,
        })
        if (data.password) {
          setPteroPassword(data.password)
          setShowPteroPassword(false)
        }
        notify.success('Аккаунт панели создан!')
      } else {
        notify.error(data.error || 'Ошибка создания аккаунта')
      }
    } catch {
      notify.error('Ошибка сети')
    }
    setPteroLoading(false)
  }

  const resetPteroPassword = async () => {
    if (pteroLoading) return
    setPteroLoading(true)
    
    try {
      const res = await fetch('/api/user/pterodactyl', { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      
      if (res.ok && data.password) {
        setPteroPassword(data.password)
        setShowPteroPassword(false)
        notify.success('Пароль панели сброшен!')
      } else {
        notify.error(data.error || 'Ошибка смены пароля')
      }
    } catch {
      notify.error('Ошибка сети')
    }
    setPteroLoading(false)
  }

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError('Пароли не совпадают')
      return
    }
    if (passwordForm.new.length < 6) {
      setPasswordError('Пароль должен быть минимум 6 символов')
      return
    }
    
    setPasswordLoading(true)
    setPasswordError(null)
    
    try {
      const res = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.new,
        }),
      })
      const data = await res.json()
      
      if (res.ok) {
        setShowPasswordModal(false)
        setPasswordForm({ current: '', new: '', confirm: '' })
        notify.success('Пароль успешно изменён!')
      } else {
        setPasswordError(data.error || 'Ошибка смены пароля')
      }
    } catch {
      setPasswordError('Ошибка сети')
    }
    setPasswordLoading(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    notify.success('Скопировано в буфер обмена')
  }

  const handleDeleteAccountConfirmPassword = async () => {
    if (!deleteAccountPassword) return
    
    setDeleteAccountLoading(true)
    setDeleteAccountError(null)
    
    try {
      const res = await fetch('/api/user/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deleteAccountPassword }),
      })
      
      if (res.ok) {
        setDeleteAccountStep(2)
      } else {
        const data = await res.json()
        setDeleteAccountError(data.error || 'Неверный пароль')
      }
    } catch {
      setDeleteAccountError('Ошибка сети')
    }
    setDeleteAccountLoading(false)
  }

  const handleDeleteAccount = async () => {
    setDeleteAccountLoading(true)
    setDeleteAccountError(null)
    
    try {
      const res = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deleteAccountPassword }),
      })
      
      if (res.ok) {
        notify.success('Аккаунт удалён')
        router.push('/')
      } else {
        const data = await res.json()
        setDeleteAccountError(data.error || 'Ошибка удаления')
      }
    } catch {
      setDeleteAccountError('Ошибка сети')
    }
    setDeleteAccountLoading(false)
  }

  const closeDeleteAccountModal = () => {
    setShowDeleteAccountModal(false)
    setDeleteAccountStep(1)
    setDeleteAccountPassword('')
    setDeleteAccountError(null)
  }

  const handleResendVerification = async () => {
    if (verificationLoading || user?.emailVerified) return
    
    setVerificationLoading(true)
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
      })
      const data = await res.json()
      
      if (res.ok) {
        notify.success(data.message || 'Код отправлен на вашу почту')
      } else {
        notify.error(data.error || 'Ошибка отправки кода')
      }
    } catch {
      notify.error('Ошибка сети')
    }
    setVerificationLoading(false)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  const contextValue: ClientContextType = {
    user,
    servers,
    vdsServers,
    plans,
    vdsPlans,
    nodes,
    loadingServers,
    loadingVds,
    loadingPlans,
    loadingVdsPlans,
    creating,
    createError,
    expandedServerId,
    setExpandedServerId,
    onCreateServer: handleCreateServer,
    onDeleteClick: (server) => {
      setSelectedServer(server)
      setShowDeleteConfirm(true)
    },
    onRenewServer: handleRenewServer,
    renewingServerId,
    pteroAccount,
    pteroLoading,
    pteroPassword,
    showPteroPassword,
    setShowPteroPassword,
    onCreatePteroAccount: createPteroAccount,
    onResetPteroPassword: resetPteroPassword,
    onShowPasswordModal: () => setShowPasswordModal(true),
    onCopyToClipboard: copyToClipboard,
    onShowDeleteAccountModal: () => setShowDeleteAccountModal(true),
    loadVdsServers,
    osImages,
    onReinstallVds: handleReinstallVds,
    reinstallingVdsId,
    onRenewVds: handleRenewVds,
    renewingVdsId,
    onResendVerification: handleResendVerification,
    verificationLoading,
  }

  return (
    <ClientContext.Provider value={contextValue}>
      <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
        <DecorativeLines />
        <ClientHeader user={user} onLogout={handleLogout} />

        <main className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 pt-24 pb-16 w-full min-h-[calc(100vh-80px)]">
          {children}
        </main>

        <div className="mt-auto">
          <Footer />
        </div>

        {selectedServer && showDeleteConfirm && (
          <DeleteServerModal
            server={selectedServer}
            deleting={deletingServer}
            onConfirm={() => handleDeleteServer(selectedServer.id)}
            onCancel={() => {
              setSelectedServer(null)
              setShowDeleteConfirm(false)
            }}
          />
        )}

        {showPasswordModal && (
          <PasswordModal
            form={passwordForm}
            setForm={setPasswordForm}
            loading={passwordLoading}
            error={passwordError}
            onSubmit={handleChangePassword}
            onClose={() => {
              setShowPasswordModal(false)
              setPasswordForm({ current: '', new: '', confirm: '' })
              setPasswordError(null)
            }}
          />
        )}

        {showDeleteAccountModal && (
          <DeleteAccountModal
            step={deleteAccountStep}
            password={deleteAccountPassword}
            setPassword={setDeleteAccountPassword}
            loading={deleteAccountLoading}
            error={deleteAccountError}
            onConfirmPassword={handleDeleteAccountConfirmPassword}
            onConfirmDelete={handleDeleteAccount}
            onClose={closeDeleteAccountModal}
          />
        )}
      </div>
    </ClientContext.Provider>
  )
}
