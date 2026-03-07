"use client"

import { useState, useEffect } from "react"
import { MousePointer2, Check, Server, CreditCard, Settings, Circle } from "lucide-react"

export function SimplicityAnimation() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 9)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const showServersList = step >= 4 && step <= 7
  const isFading = step === 4 || step === 8

  return (
    <div className="relative w-full max-w-[200px] h-[120px]">
      <div className="flex overflow-hidden rounded-lg border border-border/50 bg-background shadow-sm h-full">
        <div className="flex w-8 flex-col gap-1 border-r border-border/50 bg-muted/30 p-1.5">
          <div className={`flex size-5 items-center justify-center rounded transition-colors duration-300 ${step === 7 ? "bg-primary/30" : "bg-primary/20"}`}>
            <Server className="size-3 text-primary" />
          </div>
          <div className="flex size-5 items-center justify-center rounded text-muted-foreground/50">
            <CreditCard className="size-3" />
          </div>
          <div className="flex size-5 items-center justify-center rounded text-muted-foreground/50">
            <Settings className="size-3" />
          </div>
        </div>

        <div className={`flex-1 p-2.5 transition-opacity duration-500 ${isFading ? "opacity-0" : "opacity-100"}`}>
          {showServersList ? (
            <>
              <div className="mb-2 text-[9px] font-medium text-foreground">Ваши сервера</div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between rounded border border-border/50 bg-muted/20 px-1.5 py-1">
                  <div className="flex items-center gap-1.5">
                    <Circle className="size-2 fill-green-500 text-green-500" />
                    <div>
                      <div className="text-[8px] font-medium text-foreground">Мой сервер</div>
                      <div className="text-[6px] text-muted-foreground">Бесплатный</div>
                    </div>
                  </div>
                  <Settings className="size-3 text-muted-foreground" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mb-1.5 text-[8px] text-muted-foreground">Вы выбрали тариф</div>
              <div className="mb-2 text-[10px] font-medium text-foreground">Бесплатный</div>
              
              <div className="mb-2.5 space-y-0.5 text-[7px] text-muted-foreground">
                <div>1 vCPU</div>
                <div>4 GIB RAM</div>
                <div>10 DISK</div>
              </div>

              <div 
                className={`flex items-center justify-center rounded px-2 py-1 text-[8px] font-medium transition-all duration-300 ${
                  step === 3 
                    ? "bg-green-500 text-white" 
                    : step === 2 
                      ? "bg-primary/80 text-primary-foreground scale-95" 
                      : "bg-primary text-primary-foreground"
                }`}
              >
                {step === 3 ? (
                  <span className="flex items-center gap-0.5">
                    <Check className="size-2.5" />
                    Готово
                  </span>
                ) : (
                  "Создать сервер"
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <MousePointer2 
        className={`absolute size-4 text-foreground transition-all duration-500 ${
          step === 0 
            ? "bottom-0 right-0 opacity-0 translate-x-4 translate-y-4" 
            : step === 1 
              ? "bottom-3 right-8 opacity-100 translate-x-0 translate-y-0" 
              : step === 2
                ? "bottom-2 right-6 opacity-100"
                : step === 3
                  ? "bottom-2 right-6 opacity-0"
                  : step === 6
                    ? "top-0 left-0 opacity-0 -translate-x-4 -translate-y-4"
                    : step === 7
                      ? "top-3 left-2 opacity-100 translate-x-0 translate-y-0"
                      : "top-3 left-2 opacity-0"
        }`}
        style={{ filter: "drop-shadow(1px 1px 2px rgba(0,0,0,0.3))" }}
      />
    </div>
  )
}
