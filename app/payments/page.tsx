"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Loader2, Check, AlertCircle, ArrowLeft, Zap } from "lucide-react"
import { notify } from "@/lib/notify"

interface User {
  id: string
  email: string
  name: string | null
  balance: number
}

function PaymentsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const amount = searchParams.get("amount") || "0"
  const status = searchParams.get("status")
  const orderId = searchParams.get("order")

  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [selectedMethod, setSelectedMethod] = useState<"heleket" | "yoomoney" | "crystalpay">("heleket")
  const [promoCode, setPromoCode] = useState("")
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoResult, setPromoResult] = useState<{ valid: boolean; bonus?: number; message?: string } | null>(null)
  const [processing, setProcessing] = useState(false)

  const finalAmount = parseFloat(amount) + (promoResult?.bonus || 0)
  const newBalance = user ? user.balance + (promoResult?.valid ? finalAmount : parseFloat(amount)) : 0

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me")
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        router.push("/")
      }
    } catch {
      router.push("/")
    }
    setAuthLoading(false)
  }

  const checkPromo = async () => {
    if (!promoCode.trim()) return
    setPromoLoading(true)
    setPromoResult(null)
    try {
      const res = await fetch("/api/payments/check-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode, amount: parseFloat(amount) }),
      })
      const data = await res.json()
      if (res.ok && data.valid) {
        setPromoResult({ valid: true, bonus: data.bonus, message: data.message })
        notify.success(`Промокод применён! +${data.bonus} ₽`)
      } else {
        setPromoResult({ valid: false, message: data.error || "Недействителен" })
        notify.error(data.error || "Промокод недействителен")
      }
    } catch {
      setPromoResult({ valid: false, message: "Ошибка" })
      notify.error("Ошибка проверки промокода")
    }
    setPromoLoading(false)
  }

  const handlePayment = async () => {
    setProcessing(true)
    try {
      let payload: any
      let endpoint: string
      
      if (selectedMethod === "heleket") {
        payload = { amount: parseFloat(amount) / 90, currency: "USDT", promoCode: promoResult?.valid ? promoCode : null }
        endpoint = "/api/heleket/create"
      } else if (selectedMethod === "yoomoney") {
        payload = { amount: parseFloat(amount), promoCode: promoResult?.valid ? promoCode : null }
        endpoint = "/api/yoomoney/create"
      } else if (selectedMethod === "crystalpay") {
        payload = { amount: parseFloat(amount), promoCode: promoResult?.valid ? promoCode : null }
        endpoint = "/api/crystalpay/create"
      } else {
        notify.error("Неподдерживаемый метод")
        setProcessing(false)
        return
      }
      
      const res = await fetch(endpoint, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      })
      const data = await res.json()
      
      if (res.ok && data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        notify.error(data.error || "Ошибка")
      }
    } catch {
      notify.error("Ошибка сети")
    }
    setProcessing(false)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) return null

  // Успех
  if (status === "success" && orderId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card/30 p-8 text-center">
          <div className="size-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <Check className="size-8 text-emerald-500" />
          </div>
          <h1 className="font-heading text-xl font-bold mb-2">Оплата успешна</h1>
          <p className="text-sm text-muted-foreground mb-6">Средства зачислены</p>
          <Link href="/client/billing" className="block w-full py-3 bg-foreground text-background rounded-xl text-sm font-medium hover:bg-foreground/90 transition-colors">
            Готово
          </Link>
        </div>
      </div>
    )
  }

  // Ошибка
  if (status === "fail" && orderId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card/30 p-8 text-center">
          <div className="size-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertCircle className="size-8 text-red-500" />
          </div>
          <h1 className="font-heading text-xl font-bold mb-2">Ошибка</h1>
          <p className="text-sm text-muted-foreground mb-6">Платёж не завершён</p>
          <Link href="/client/billing" className="block w-full py-3 bg-foreground text-background rounded-xl text-sm font-medium hover:bg-foreground/90 transition-colors">
            Назад
          </Link>
        </div>
      </div>
    )
  }

  const methods = [
    { id: "heleket", name: "Crypto", icon: "/heleket.png" },
    { id: "yoomoney", name: "YooMoney", icon: "/yoomoney.png" },
    { id: "crystalpay", name: "CrystalPay", icon: "/crystalpay.png.png" },
  ] as const

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/client/billing" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="size-4" />
          Назад
        </Link>

        <div className="rounded-2xl border border-border/50 bg-card/30 overflow-hidden">
          {/* Сумма */}
          <div className="p-6 border-b border-border/50 text-center">
            <p className="text-xs text-muted-foreground mb-1">К оплате</p>
            <p className="font-heading text-4xl font-bold tabular-nums">{amount} ₽</p>
            {promoResult?.valid && promoResult.bonus && (
              <p className="text-sm text-emerald-500 mt-2">+{promoResult.bonus} ₽ бонус</p>
            )}
          </div>

          <div className="p-6 space-y-5">
            {/* Способы оплаты */}
            <div>
              <p className="text-xs text-muted-foreground mb-3">Способ оплаты</p>
              <div className="grid grid-cols-1 gap-2">
                {methods.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMethod(m.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                      selectedMethod === m.id
                        ? "border-foreground/30 bg-foreground/5"
                        : "border-border/50 hover:border-border"
                    }`}
                  >
                    <Image src={m.icon} alt={m.name} width={20} height={20} className="rounded" />
                    <span className="text-sm">{m.name}</span>
                    {selectedMethod === m.id && <Check className="size-3.5 ml-auto" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Промокод */}
            <div>
              <p className="text-xs text-muted-foreground mb-3">Промокод</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoResult(null) }}
                  placeholder="PROMO"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border/50 bg-card/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 transition-colors"
                />
                <button
                  onClick={checkPromo}
                  disabled={promoLoading || !promoCode.trim()}
                  className="px-4 py-2.5 rounded-xl border border-border/50 text-sm hover:bg-muted/50 disabled:opacity-50 transition-colors"
                >
                  {promoLoading ? <Loader2 className="size-4 animate-spin" /> : "OK"}
                </button>
              </div>
              {promoResult && (
                <p className={`text-xs mt-2 ${promoResult.valid ? "text-emerald-500" : "text-red-500"}`}>
                  {promoResult.valid ? "Применён" : promoResult.message}
                </p>
              )}
            </div>

            {/* Баланс */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Баланс</span>
                <span>{user.balance.toFixed(0)} ₽</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">После оплаты</span>
                <span className="text-emerald-500 font-medium">{newBalance.toFixed(0)} ₽</span>
              </div>
            </div>

            {/* Кнопка */}
            <button
              onClick={handlePayment}
              disabled={processing}
              className="w-full flex items-center justify-center gap-2 py-3 bg-foreground text-background rounded-xl text-sm font-medium hover:bg-foreground/90 disabled:opacity-50 transition-colors"
            >
              {processing ? <Loader2 className="size-4 animate-spin" /> : <><Zap className="size-4" />Оплатить</>}
            </button>

            <p className="text-xs text-center text-muted-foreground">
              <Link href="/docs" className="underline hover:text-foreground transition-colors">Условия оферты</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <PaymentsContent />
    </Suspense>
  )
}
