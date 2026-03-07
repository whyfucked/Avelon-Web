"use client"

import { Settings, Shield, Link2, LogOut, Plus, Check, ExternalLink, RefreshCw, Eye, EyeOff, Copy, Loader2, Mail, CheckCircle, XCircle } from "lucide-react"
import { User } from "../types"
import { useState } from "react"
import { VerifyEmailModal } from "../modals/verify-email-modal"

interface PteroAccount {
  linked: boolean
  username?: string
  email?: string
}

interface SettingsTabProps {
  user: User
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
  onResendVerification?: () => void
  verificationLoading?: boolean
}

export function SettingsTab({
  user,
  pteroAccount,
  pteroLoading,
  pteroPassword,
  showPteroPassword,
  setShowPteroPassword,
  onCreatePteroAccount,
  onResetPteroPassword,
  onShowPasswordModal,
  onCopyToClipboard,
  onShowDeleteAccountModal,
  onResendVerification,
  verificationLoading = false,
}: SettingsTabProps) {
  const [showVerifyModal, setShowVerifyModal] = useState(false)

  const handleResendVerification = async () => {
    if (onResendVerification) {
      await onResendVerification()
      setShowVerifyModal(true)
    }
  }

  const handleVerificationSuccess = () => {
    // Перезагрузить страницу чтобы обновить статус
    window.location.reload()
  }
  return (
    <div className="max-w-5xl mx-auto pb-8">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden mb-6 border border-border/50 bg-card/30 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div 
          className="absolute inset-0"
          style={{ backgroundImage: 'url(/waves.jpg)', backgroundPosition: 'center', backgroundSize: 'cover' }}
        />
        <div className="absolute inset-0 bg-black/40" />
        
        <div className="relative z-10 p-6">
          <h1 className="font-heading text-2xl font-bold text-white">Настройки</h1>
          <p className="text-white/60 text-sm mt-1">Управление аккаунтом и безопасностью</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/50 bg-card/30 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          <div className="px-5 py-4 border-b border-border/30 bg-muted/20">
            <h2 className="font-heading font-bold text-foreground flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Settings className="size-4 text-primary" />
              </div>
              Профиль
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</label>
              <div className="mt-1.5 px-4 py-2.5 rounded-xl bg-muted/30 border border-border/30 text-sm text-muted-foreground flex items-center justify-between">
                <span>{user.email}</span>
                {user.emailVerified ? (
                  <div className="flex items-center gap-1.5 text-emerald-500">
                    <CheckCircle className="size-4" />
                    <span className="text-xs font-medium">Подтвержден</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-red-500">
                    <XCircle className="size-4" />
                    <span className="text-xs font-medium">Не подтвержден</span>
                  </div>
                )}
              </div>
              {!user.emailVerified && onResendVerification && (
                <button
                  onClick={handleResendVerification}
                  disabled={verificationLoading}
                  className="mt-2 flex items-center gap-2 text-xs text-primary hover:text-primary/80 disabled:opacity-50"
                >
                  {verificationLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Mail className="size-3.5" />
                  )}
                  Отправить код подтверждения
                </button>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Имя</label>
              <input 
                type="text" 
                defaultValue={user.name || ''}
                placeholder="Ваше имя"
                className="w-full mt-1.5 rounded-xl border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
              />
            </div>
            <button className="w-full mt-2 rounded-xl bg-foreground py-2.5 text-sm font-medium text-background hover:bg-foreground/90 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200">
              Сохранить
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/30 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
          <div className="px-5 py-4 border-b border-border/30 bg-muted/20">
            <h2 className="font-heading font-bold text-foreground flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="size-4 text-primary" />
              </div>
              Безопасность
            </h2>
          </div>
          <div className="p-5">
            <p className="text-sm text-muted-foreground mb-4">
              Управление паролем от аккаунта на сайте
            </p>
            <button 
              onClick={onShowPasswordModal}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
            >
              <RefreshCw className="size-4" />
              Сменить пароль
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-border/50 bg-card/30 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <div className="px-5 py-4 border-b border-border/30 bg-muted/20">
            <h2 className="font-heading font-bold text-foreground flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Link2 className="size-4 text-primary" />
              </div>
              Панель управления серверами
            </h2>
          </div>
          <div className="p-5">
            {pteroAccount === null ? (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                <span className="text-sm">Загрузка...</span>
              </div>
            ) : !pteroAccount.linked ? (
              <div className="text-center py-6">
                <div className="size-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
                  <Link2 className="size-7 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Создайте аккаунт для доступа к панели управления серверами
                </p>
                <button
                  onClick={onCreatePteroAccount}
                  disabled={pteroLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-foreground px-6 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                >
                  {pteroLoading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  Создать аккаунт
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/30">
                  <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Check className="size-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{pteroAccount.username}</p>
                    <p className="text-sm text-muted-foreground truncate">{pteroAccount.email}</p>
                  </div>
                  <a
                    href={process.env.NEXT_PUBLIC_PTERODACTYL_URL || 'https://control.yourdomain.ru'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  >
                    <ExternalLink className="size-4" />
                    Открыть
                  </a>
                </div>
                
                {pteroPassword && (
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-sm text-muted-foreground font-medium mb-3">Ваш новый пароль:</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-4 py-3 rounded-xl bg-background border border-border/50 select-all">
                        <span className="text-base font-normal text-foreground">
                          {showPteroPassword ? pteroPassword : '••••••••••••'}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowPteroPassword(!showPteroPassword)}
                        className="size-11 rounded-xl flex items-center justify-center hover:bg-muted/50 hover:scale-105 active:scale-95 text-muted-foreground transition-all duration-200"
                        title={showPteroPassword ? "Скрыть" : "Показать"}
                      >
                        {showPteroPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </button>
                      <button
                        onClick={() => pteroPassword && onCopyToClipboard(pteroPassword)}
                        className="size-11 rounded-xl flex items-center justify-center hover:bg-muted/50 hover:scale-105 active:scale-95 text-muted-foreground transition-all duration-200"
                        title="Копировать"
                      >
                        <Copy className="size-5" />
                      </button>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={onResetPteroPassword}
                  disabled={pteroLoading}
                  className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm text-foreground hover:bg-muted/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-50"
                >
                  {pteroLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  Сбросить пароль панели
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-red-500/20 bg-red-500/5 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
          <div className="px-5 py-4 border-b border-red-500/20 bg-red-500/10">
            <h2 className="font-heading font-bold text-red-400 flex items-center gap-2">
              <div className="size-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <LogOut className="size-4 text-red-400" />
              </div>
              Опасная зона
            </h2>
          </div>
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Удалить аккаунт</p>
              <p className="text-xs text-muted-foreground mt-0.5">Все данные и серверы будут удалены навсегда</p>
            </div>
            <button 
              onClick={onShowDeleteAccountModal}
              className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              Удалить
            </button>
          </div>
        </div>
      </div>

      {showVerifyModal && (
        <VerifyEmailModal
          email={user.email}
          onClose={() => setShowVerifyModal(false)}
          onSuccess={handleVerificationSuccess}
        />
      )}
    </div>
  )
}
