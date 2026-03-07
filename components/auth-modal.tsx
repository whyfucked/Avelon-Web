"use client"

import { useState, useEffect, useRef } from "react"
import { X, Eye, EyeOff, Loader2, AtSign, KeyRound, UserCircle2, Fingerprint, UserRoundPlus, ArrowLeft, Mail } from "lucide-react"
import { Logo } from "@/components/logo"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "verify">("login")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [shake, setShake] = useState(false)
  const [verifyEmail, setVerifyEmail] = useState("")
  const [verifyCode, setVerifyCode] = useState(["", "", "", "", "", ""])
  const [resendCooldown, setResendCooldown] = useState(0)
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    confirmPassword: "",
  })

  const isEmailValid = (email: string) => {
    if (!email) return true
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const emailError = emailTouched && formData.email && !isEmailValid(formData.email)

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setError(null)
      setSuccess(null)
      setTimeout(() => setIsAnimating(true), 10)
    } else {
      setIsAnimating(false)
      setTimeout(() => setIsVisible(false), 400)
    }
  }, [isOpen])

  useEffect(() => {
    if (error) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }, [error])

  // Focus first code input when entering verify mode
  useEffect(() => {
    if (mode === "verify" && codeInputRefs.current[0]) {
      setTimeout(() => codeInputRefs.current[0]?.focus(), 100)
    }
  }, [mode])

  if (!isVisible) return null

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    
    const newCode = [...verifyCode]
    newCode[index] = value.slice(-1)
    setVerifyCode(newCode)
    setError(null)
    
    // Auto-focus next input
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus()
    }
    
    // Auto-submit when all digits entered
    if (newCode.every(d => d) && newCode.join("").length === 6) {
      handleVerifyCode(newCode.join(""))
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
      handleVerifyCode(pasted)
    }
  }

  const handleVerifyCode = async (code: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail, code }),
      })
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Неверный код')
        setVerifyCode(["", "", "", "", "", ""])
        codeInputRefs.current[0]?.focus()
        setIsLoading(false)
        return
      }
      
      // Email verified, now login
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: verifyEmail,
          password: formData.password,
        }),
      })
      
      if (loginRes.ok) {
        onSuccess?.()
        handleClose()
      } else {
        setSuccess('Email подтверждён! Теперь войдите в аккаунт.')
        setMode("login")
        setFormData(prev => ({ ...prev, email: verifyEmail }))
      }
    } catch {
      setError('Ошибка проверки кода')
    }
    setIsLoading(false)
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail }),
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
    setIsLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Forgot password mode
      if (mode === "forgot") {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email }),
        })
        const data = await res.json()
        
        if (!res.ok) {
          setError(data.error || 'Ошибка отправки')
          setIsLoading(false)
          return
        }
        
        setSuccess('Инструкции отправлены на вашу почту')
        setIsLoading(false)
        return
      }

      if (mode === "register") {
        if (formData.password !== formData.confirmPassword) {
          setError("Пароли не совпадают")
          setIsLoading(false)
          return
        }
        
        const regRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            name: formData.username,
          }),
        })
        const regData = await regRes.json()
        
        if (!regRes.ok) {
          setError(regData.error || 'Ошибка регистрации')
          setIsLoading(false)
          return
        }
        
        // Check if verification required
        if (regData.requiresVerification) {
          setVerifyEmail(formData.email)
          setVerifyCode(["", "", "", "", "", ""])
          setMode("verify")
          setResendCooldown(60)
          setIsLoading(false)
          return
        }
        
        // Registration successful without verification, auto-login
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        })
        const loginData = await loginRes.json()

        if (!loginRes.ok) {
          setError(loginData.error || 'Ошибка входа')
          setIsLoading(false)
          return
        }

        onSuccess?.()
        handleClose()
        setIsLoading(false)
        return
      }

      // Login mode
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })
      const loginData = await loginRes.json()

      if (!loginRes.ok) {
        setError(loginData.error || 'Ошибка входа')
        setIsLoading(false)
        return
      }

      onSuccess?.()
      handleClose()
    } catch {
      setError('Произошла ошибка')
    }
    
    setIsLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
    setSuccess(null)
  }

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(() => {
      onClose()
      // Reset state
      setMode("login")
      setVerifyCode(["", "", "", "", "", ""])
      setVerifyEmail("")
      setResendCooldown(0)
    }, 400)
  }

  const inputBaseClass = "w-full bg-background/50 border-2 rounded-xl py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none transition-all duration-300 hover:border-border focus:bg-background/80 shadow-sm"
  const inputNormalClass = "border-border/40 focus:border-primary focus:shadow-[0_0_0_4px_rgba(var(--primary),0.1)]"
  const inputErrorClass = "border-red-500/70 focus:border-red-500 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.1)]"

  // Verification UI
  if (mode === "verify") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
        <div 
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-400 ${isAnimating ? "opacity-100" : "opacity-0"}`}
          onClick={handleClose}
        />
        
        <div 
          className={`relative w-full max-w-sm transition-all duration-400 ease-out ${
            isAnimating ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
          } ${shake ? "animate-shake" : ""}`}
          style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-border">
            <button onClick={handleClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-muted/50 hover:bg-red-500/20 group">
              <X className="size-4 text-muted-foreground group-hover:text-red-500" />
            </button>

            <div className="relative p-6">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="size-8 text-primary" />
                </div>
                <h2 className="font-heading text-xl font-bold text-foreground mb-1">Подтвердите email</h2>
                <p className="text-sm text-muted-foreground">
                  Код отправлен на <span className="text-foreground font-medium">{verifyEmail}</span>
                </p>
              </div>

              {/* Error */}
              <div className={`overflow-hidden transition-all duration-300 ${error ? "max-h-20 opacity-100 mb-4" : "max-h-0 opacity-0 mb-0"}`}>
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                  {error}
                </div>
              </div>

              {/* Success */}
              <div className={`overflow-hidden transition-all duration-300 ${success ? "max-h-20 opacity-100 mb-4" : "max-h-0 opacity-0 mb-0"}`}>
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm text-center">
                  {success}
                </div>
              </div>

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
                    disabled={isLoading}
                    className="w-12 h-14 text-center text-2xl font-bold bg-background/50 border-2 border-border/40 rounded-xl focus:border-primary focus:outline-none focus:shadow-[0_0_0_4px_rgba(var(--primary),0.1)] transition-all disabled:opacity-50"
                  />
                ))}
              </div>

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-sm">Проверяем...</span>
                </div>
              )}

              {/* Resend */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Не получили код?</p>
                {resendCooldown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Отправить повторно через <span className="text-foreground font-medium">{resendCooldown}</span> сек
                  </p>
                ) : (
                  <button
                    onClick={handleResendCode}
                    disabled={isLoading}
                    className="text-sm text-primary font-medium hover:underline disabled:opacity-50"
                  >
                    Отправить повторно
                  </button>
                )}
              </div>

              {/* Back button */}
              <button
                onClick={() => { setMode("register"); setError(null); setSuccess(null) }}
                className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-4 mx-auto transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                <span>Изменить email</span>
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
            20%, 40%, 60%, 80% { transform: translateX(4px); }
          }
          .animate-shake { animation: shake 0.5s ease-in-out; }
        `}</style>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-400 ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-sm transition-all duration-400 ease-out ${
          isAnimating 
            ? "opacity-100 scale-100 translate-y-0" 
            : "opacity-0 scale-95 translate-y-4"
        } ${shake ? "animate-shake" : ""}`}
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-border">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-muted/50 hover:bg-red-500/20 group"
          >
            <X className="size-4 text-muted-foreground group-hover:text-red-500" />
          </button>

          <div className="relative p-5">
            {/* Logo & Title */}
            <div className={`text-center mb-5 transition-all duration-500 ${isAnimating ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`} style={{ transitionDelay: "100ms" }}>
              <Logo className="size-8 text-foreground mx-auto mb-2" />
              <h2 className="font-heading text-lg font-bold text-foreground">
                {mode === "login" ? "Добро пожаловать" : mode === "register" ? "Создать аккаунт" : "Восстановление"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {mode === "login" ? "Войдите в свой аккаунт" : mode === "register" ? "Заполните данные для регистрации" : "Введите почту для восстановления"}
              </p>
            </div>

            {/* Tabs - hide in forgot mode */}
            {mode !== "forgot" && (
              <div className={`relative flex bg-muted/20 rounded-xl p-1 mb-4 transition-all duration-500 border border-border/30 ${isAnimating ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`} style={{ transitionDelay: "150ms" }}>
                <div 
                  className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-background rounded-lg shadow-lg transition-all duration-300 ease-out"
                  style={{ left: mode === "login" ? "4px" : "calc(50% + 0px)" }}
                />
                <button
                  onClick={() => { setMode("login"); setError(null); setSuccess(null); setEmailTouched(false) }}
                  className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all duration-300 ${
                    mode === "login" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Fingerprint className={`size-3.5 transition-transform duration-300 ${mode === "login" ? "scale-110" : ""}`} />
                  <span className="inline-block w-1 h-1 rounded-full bg-current opacity-40" />
                  <span>Вход</span>
                </button>
                <button
                  onClick={() => { setMode("register"); setError(null); setSuccess(null); setEmailTouched(false) }}
                  className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all duration-300 ${
                    mode === "register" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <UserRoundPlus className={`size-3.5 transition-transform duration-300 ${mode === "register" ? "scale-110" : ""}`} />
                  <span className="inline-block w-1 h-1 rounded-full bg-current opacity-40" />
                  <span>Регистрация</span>
                </button>
              </div>
            )}

            {/* Back button for forgot mode */}
            {mode === "forgot" && (
              <button
                onClick={() => { setMode("login"); setError(null); setSuccess(null); setEmailTouched(false) }}
                className={`flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-all duration-300 ${isAnimating ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
                style={{ transitionDelay: "150ms" }}
              >
                <ArrowLeft className="size-3.5" />
                <span>Назад к входу</span>
              </button>
            )}

            {/* Error */}
            <div className={`overflow-hidden transition-all duration-300 ${error ? "max-h-20 opacity-100 mb-4" : "max-h-0 opacity-0 mb-0"}`}>
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                {error}
              </div>
            </div>

            {/* Success */}
            <div className={`overflow-hidden transition-all duration-300 ${success ? "max-h-20 opacity-100 mb-4" : "max-h-0 opacity-0 mb-0"}`}>
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm text-center">
                {success}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="selectable">
              {/* Username - only for register */}
              <div className={`overflow-hidden transition-all duration-300 ${mode === "register" ? "max-h-20 opacity-100 mb-2" : "max-h-0 opacity-0 mb-0"}`}>
                <div className="relative">
                  <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors" />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Имя пользователя"
                    className={`${inputBaseClass} ${inputNormalClass}`}
                    tabIndex={mode === "register" ? 0 : -1}
                  />
                </div>
              </div>

              {/* Divider for register */}
              <div className={`overflow-hidden transition-all duration-300 ${mode === "register" ? "max-h-8 opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">данные входа</span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>
              </div>

              {/* Email */}
              <div className={`transition-all duration-500 ${isAnimating ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`} style={{ transitionDelay: "200ms" }}>
                <div className="relative">
                  <AtSign className={`absolute left-3 top-1/2 -translate-y-1/2 size-4 transition-colors duration-200 ${emailError ? "text-red-500" : "text-muted-foreground"}`} />
                  <input
                    type="text"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="Почта"
                    className={`${inputBaseClass} ${emailError ? inputErrorClass : inputNormalClass}`}
                    required
                  />
                </div>
                <div className={`overflow-hidden transition-all duration-200 ${emailError ? "max-h-6 opacity-100" : "max-h-0 opacity-0"}`}>
                  <p className="text-xs text-red-500 mt-1 ml-1">Введите корректную почту</p>
                </div>
              </div>

              {/* Divider between email and password - hide in forgot mode */}
              <div className={`overflow-hidden transition-all duration-300 ${mode !== "forgot" ? "max-h-8 opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
                </div>
              </div>

              {/* Password - hide in forgot mode */}
              <div className={`overflow-hidden transition-all duration-300 ${mode !== "forgot" ? "max-h-20 opacity-100" : "max-h-0 opacity-0"}`}>
                <div className={`relative transition-all duration-500 ${isAnimating ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`} style={{ transitionDelay: "250ms" }}>
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Пароль"
                    className={`${inputBaseClass} ${inputNormalClass} pr-10`}
                    required={mode !== "forgot"}
                    tabIndex={mode === "forgot" ? -1 : 0}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110"
                    tabIndex={mode === "forgot" ? -1 : 0}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password - only for register */}
              <div className={`overflow-hidden transition-all duration-300 ${mode === "register" ? "max-h-16 opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"}`}>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Подтвердите пароль"
                    className={`${inputBaseClass} ${inputNormalClass}`}
                    tabIndex={mode === "register" ? 0 : -1}
                  />
                </div>
              </div>

              {/* Terms checkbox - only for register */}
              <div className={`overflow-hidden transition-all duration-300 ${mode === "register" ? "max-h-20 opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"}`}>
                <label className="flex items-center gap-2.5 cursor-pointer group p-2.5 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/20 transition-all duration-200">
                  <div className="relative">
                    <input type="checkbox" className="peer sr-only" required={mode === "register"} tabIndex={mode === "register" ? 0 : -1} />
                    <div className="size-4 rounded border-2 border-border/60 peer-checked:bg-primary peer-checked:border-primary transition-all duration-200 group-hover:border-primary/50" />
                    <svg className="absolute inset-0 size-4 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-all duration-200 p-0.5" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-xs text-muted-foreground leading-tight">
                    Принимаю{" "}
                    <a href="/terms" className="text-primary hover:underline">условия</a>
                    {" "}и{" "}
                    <a href="/privacy" className="text-primary hover:underline">политику</a>
                  </span>
                </label>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading || !!emailError}
                className={`w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 mt-3 hover:shadow-lg hover:shadow-primary/25 ${isAnimating ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
                style={{ transitionDelay: "300ms" }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>{mode === "login" ? "Входим..." : mode === "register" ? "Создаём..." : "Отправляем..."}</span>
                  </>
                ) : (
                  <>
                    {mode === "forgot" && <Mail className="size-4" />}
                    <span>{mode === "login" ? "Войти" : mode === "register" ? "Создать аккаунт" : "Отправить"}</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <p className={`text-center text-xs text-muted-foreground mt-4 transition-all duration-500 ${isAnimating ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`} style={{ transitionDelay: "350ms" }}>
              {mode === "login" ? (
                <>
                  Нет аккаунта?{" "}
                  <button
                    onClick={() => { setMode("register"); setError(null); setSuccess(null); setEmailTouched(false) }}
                    className="text-primary font-medium hover:underline hover:text-primary/80 transition-all duration-200 hover:scale-105 inline-block"
                  >
                    Зарегистрируйтесь
                  </button>
                  <span className="inline-block mx-2 w-1 h-1 rounded-full bg-muted-foreground/50 align-middle" />
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setError(null); setSuccess(null); setEmailTouched(false) }}
                    className="text-primary font-medium hover:underline hover:text-primary/80 transition-all duration-200 hover:scale-105 inline-block"
                  >
                    Забыли пароль?
                  </button>
                </>
              ) : mode === "register" ? (
                <>
                  Уже есть аккаунт?{" "}
                  <button
                    onClick={() => { setMode("login"); setError(null); setSuccess(null); setEmailTouched(false) }}
                    className="text-primary font-medium hover:underline hover:text-primary/80 transition-all duration-200 hover:scale-105 inline-block"
                  >
                    Войдите
                  </button>
                </>
              ) : (
                <>
                  Вспомнили пароль?{" "}
                  <button
                    onClick={() => { setMode("login"); setError(null); setSuccess(null); setEmailTouched(false) }}
                    className="text-primary font-medium hover:underline hover:text-primary/80 transition-all duration-200 hover:scale-105 inline-block"
                  >
                    Войдите
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  )
}
