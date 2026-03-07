"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Logo } from "@/components/logo"

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus("success")
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="size-12 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Проверяем статус платежа...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border p-8 text-center space-y-6">
          <Logo className="size-10 mx-auto" />
          
          {status === "success" ? (
            <>
              <div className="size-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="size-8 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-xl font-medium text-foreground">Платёж успешен</h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Баланс будет зачислен в течение нескольких минут
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                <XCircle className="size-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-xl font-medium text-foreground">Ошибка платежа</h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Попробуйте ещё раз или обратитесь в поддержку
                </p>
              </div>
            </>
          )}

          <Link
            href="/client/billing"
            className="inline-block w-full py-3 rounded-xl bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors"
          >
            Вернуться в личный кабинет
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
