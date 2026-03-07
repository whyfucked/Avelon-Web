"use client"

import { useState } from "react"
import { AlertTriangle, Loader2, X, Eye, EyeOff } from "lucide-react"

interface DeleteAccountModalProps {
  step: 1 | 2
  password: string
  setPassword: (password: string) => void
  loading: boolean
  error: string | null
  onConfirmPassword: () => void
  onConfirmDelete: () => void
  onClose: () => void
}

export function DeleteAccountModal({
  step,
  password,
  setPassword,
  loading,
  error,
  onConfirmPassword,
  onConfirmDelete,
  onClose,
}: DeleteAccountModalProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-red-500/30 bg-background p-6 shadow-xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:scale-110 active:scale-95 transition-all duration-200"
        >
          <X className="size-4" />
        </button>

        <div className="size-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="size-7 text-red-500" />
        </div>

        {step === 1 ? (
          <>
            <h2 className="font-heading text-xl font-bold text-foreground text-center mb-2">
              Удаление аккаунта
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Введите пароль от аккаунта для подтверждения
            </p>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ваш пароль"
                  className="w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all duration-200"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center animate-in fade-in slide-in-from-top-2 duration-200">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-border/50 bg-muted/20 py-3 text-sm font-medium text-foreground hover:bg-muted/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  Отмена
                </button>
                <button
                  onClick={onConfirmPassword}
                  disabled={loading || !password}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-medium text-white hover:bg-red-600 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Продолжить
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-heading text-xl font-bold text-foreground text-center mb-2">
              Вы уверены?
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Это действие необратимо. Все ваши данные, серверы и баланс будут удалены навсегда.
            </p>

            {error && (
              <p className="text-sm text-red-500 text-center mb-4 animate-in fade-in slide-in-from-top-2 duration-200">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-border/50 bg-muted/20 py-3 text-sm font-medium text-foreground hover:bg-muted/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Отмена
              </button>
              <button
                onClick={onConfirmDelete}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-medium text-white hover:bg-red-600 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                Удалить навсегда
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
