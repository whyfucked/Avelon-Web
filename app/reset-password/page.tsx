"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle, XCircle } from "lucide-react"

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [validating, setValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)

  useEffect(() => {
    if (!token) {
      setValidating(false)
      return
    }

    fetch(`/api/auth/reset-password?token=${token}`)
      .then(res => res.json())
      .then(data => {
        setTokenValid(data.valid)
        setValidating(false)
      })
      .catch(() => {
        setTokenValid(false)
        setValidating(false)
      })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError("Пароли не совпадают")
      return
    }

    if (password.length < 6) {
      setError("Пароль должен быть минимум 6 символов")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Ошибка сброса пароля")
        setIsLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => router.push("/?auth=open"), 2000)
    } catch {
      setError("Произошла ошибка")
    }

    setIsLoading(false)
  }

  if (validating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Проверка ссылки...</p>
        </div>
      </div>
    )
  }

  if (!token || !tokenValid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border p-8">
            <XCircle className="size-12 text-destructive mx-auto mb-4" />
            <h1 className="font-heading text-xl font-bold text-foreground mb-2">
              Ссылка недействительна
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Ссылка для сброса пароля истекла или недействительна.
            </p>
            <Link
              href="/?auth=open"
              className="inline-block bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Вернуться к входу
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border p-8">
            <CheckCircle className="size-12 text-green-500 mx-auto mb-4" />
            <h1 className="font-heading text-xl font-bold text-foreground mb-2">
              Пароль изменён!
            </h1>
            <p className="text-sm text-muted-foreground">
              Перенаправляем на страницу входа...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border p-6">
          <div className="text-center mb-6">
            <Logo className="size-8 text-foreground mx-auto mb-3" />
            <h1 className="font-heading text-lg font-bold text-foreground">
              Новый пароль
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Введите новый пароль для аккаунта
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Новый пароль"
                className="w-full bg-background/50 border-2 border-border/40 rounded-xl py-3 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Подтвердите пароль"
                className="w-full bg-background/50 border-2 border-border/40 rounded-xl py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-xl py-2.5 text-sm font-semibold text-primary-foreground transition-all flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Сохраняем...</span>
                </>
              ) : (
                <span>Сохранить пароль</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
