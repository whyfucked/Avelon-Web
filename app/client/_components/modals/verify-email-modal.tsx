"use client"

import { useState, useEffect, useRef } from "react"
import { X, Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

interface VerifyEmailModalProps {
  email: string
  onClose: () => void
  onSuccess: () => void
}

export function VerifyEmailModal({ email, onClose, onSuccess }: VerifyEmailModalProps) {
  const [verifyCode, setVerifyCode] = useState(["", "", "", "", "", ""])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  useEffect(() => {
    // Автофокус на первое поле при открытии
    codeInputRefs.current[0]?.focus()
  }, [])

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    
    const newCode = [...verifyCode]
    newCode[index] = value.slice(-1)
    setVerifyCode(newCode)
    setError(null)
    
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus()
    }
    
    if (newCode.every(d => d) && newCode.join("").length === 6) {
      handleVerify(newCode.join(""))
    }
  }

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !verifyCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus()
    }
  }

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pasted.length === 6) {
      const newCode = pasted.split("")
      setVerifyCode(newCode)
      handleVerify(pasted)
    }
  }

  const handleVerify = async (code: string) => {
    setIsVerifying(true)
    setError(null)
    
    try {
      const res = await fetch('/api/auth/verify-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Неверный код')
        setVerifyCode(["", "", "", "", "", ""])
        codeInputRefs.current[0]?.focus()
        setIsVerifying(false)
        return
      }
      
      setSuccess('Email успешно подтверждён!')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch {
      setError('Ошибка проверки кода')
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    
    setIsResending(true)
    setError(null)
    
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
      })
      const data = await res.json()
      
      if (res.ok) {
        setSuccess('Код отправлен повторно')
        setResendCooldown(60)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || 'Ошибка отправки')
      }
    } catch {
      setError('Ошибка сети')
    }
    setIsResending(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Подтвердите email</h2>
              <p className="text-xs text-muted-foreground">Код отправлен на {email}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="size-8 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error */}
          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-3">
              <AlertCircle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-4 flex items-start gap-3 rounded-xl bg-green-500/10 border border-green-500/20 p-3">
              <CheckCircle2 className="size-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-500">{success}</p>
            </div>
          )}

          {/* Code inputs */}
          <div className="flex justify-center gap-2 mb-6" onPaste={handleCodePaste}>
            {verifyCode.map((digit, i) => (
              <input
                key={i}
                ref={el => { codeInputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleCodeChange(i, e.target.value)}
                onKeyDown={e => handleCodeKeyDown(i, e)}
                disabled={isVerifying}
                className="w-12 h-14 text-center text-2xl font-bold bg-background border-2 border-border rounded-xl focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all disabled:opacity-50"
              />
            ))}
          </div>

          {/* Loading indicator */}
          {isVerifying && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-6">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Проверяем...</span>
            </div>
          )}

          {/* Resend */}
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground mb-3">Не получили код?</p>
            {resendCooldown > 0 ? (
              <p className="text-sm text-muted-foreground">
                Отправить повторно через <span className="text-foreground font-medium">{resendCooldown}</span> сек
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={isResending}
                className="text-sm text-primary hover:text-primary/80 font-medium disabled:opacity-50 transition-colors"
              >
                {isResending ? (
                  <span className="flex items-center gap-2 justify-center">
                    <Loader2 className="size-4 animate-spin" />
                    Отправка...
                  </span>
                ) : (
                  'Отправить повторно'
                )}
              </button>
            )}
          </div>

          {/* Info */}
          <div className="bg-muted/30 rounded-xl p-4 text-sm text-muted-foreground">
            <p className="mb-1">
              <strong className="text-foreground">Зачем нужна верификация?</strong>
            </p>
            <p className="text-xs">
              Подтверждение email необходимо для создания серверов и пополнения баланса.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
