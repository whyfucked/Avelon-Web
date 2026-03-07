"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Mail, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function VerifyAccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [verifyCode, setVerifyCode] = useState(["", "", "", "", "", ""])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) {
        router.push('/client')
        return
      }
      const data = await res.json()
      
      if (data.emailVerified) {
        router.push('/client')
        return
      }
      
      setUser(data)
    } catch {
      router.push('/client')
    }
    setLoading(false)
  }

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
        router.push('/client')
      }, 2000)
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
      } else {
        setError(data.error || 'Ошибка отправки')
      }
    } catch {
      setError('Ошибка сети')
    }
    setIsResending(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail className="size-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Подтвердите email</h1>
            <p className="text-sm text-muted-foreground">
              Код отправлен на <span className="text-foreground font-medium">{user?.email}</span>
            </p>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success */}
          {success && (
            <Alert className="mb-6 border-green-500/20 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">{success}</AlertDescription>
            </Alert>
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
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground mb-3">Не получили код?</p>
            {resendCooldown > 0 ? (
              <p className="text-sm text-muted-foreground">
                Отправить повторно через <span className="text-foreground font-medium">{resendCooldown}</span> сек
              </p>
            ) : (
              <Button
                onClick={handleResend}
                disabled={isResending}
                variant="outline"
                size="sm"
              >
                {isResending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Отправка...
                  </>
                ) : (
                  'Отправить повторно'
                )}
              </Button>
            )}
          </div>

          {/* Info */}
          <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
            <p className="mb-2">
              <strong className="text-foreground">Зачем нужна верификация?</strong>
            </p>
            <p>
              Подтверждение email необходимо для создания серверов и пополнения баланса. 
              Это защищает ваш аккаунт от несанкционированного доступа.
            </p>
          </div>

          {/* Back button */}
          <div className="mt-6 text-center">
            <Button
              onClick={() => router.push('/client')}
              variant="ghost"
              size="sm"
            >
              Вернуться в панель
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
