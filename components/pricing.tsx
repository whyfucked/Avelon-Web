"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Server, Cloud, Cpu, HardDrive, Database, Wifi, Code, Shield, RussianRuble, DollarSign, Euro, Lock, Zap, Flame, ArrowRight, LogIn } from "lucide-react"
import { publicGamePlans } from "@/lib/public-plans"


const vdsPlansPromo = [
  { name: "PROMO-1", cpu: "AMD Ryzen 7 1700X PRO", vcpu: 1, ram: "2 ГБ", disk: "20 ГБ", diskType: "NVMe", network: "1 Гбит/с", location: "Germany", flag: "/de.png", price: 110 },
  { name: "PROMO-2", cpu: "AMD Ryzen 7 1700X PRO", vcpu: 3, ram: "4 ГБ", disk: "40 ГБ", diskType: "NVMe", network: "1 Гбит/с", location: "Germany", flag: "/de.png", price: 199 },
  { name: "PROMO-3", cpu: "AMD Ryzen 7 1700X PRO", vcpu: 4, ram: "6 ГБ", disk: "60 ГБ", diskType: "NVMe", network: "1 Гбит/с", location: "Germany", flag: "/de.png", price: 299 },
  { name: "PROMO-4", cpu: "AMD Ryzen 7 1700X PRO", vcpu: 5, ram: "12 ГБ", disk: "80 ГБ", diskType: "NVMe", network: "1 Гбит/с", location: "Germany", flag: "/de.png", price: 429 },
  { name: "PROMO-5", cpu: "AMD Ryzen 7 1700X PRO", vcpu: 6, ram: "16 ГБ", disk: "100 ГБ", diskType: "NVMe", network: "1 Гбит/с", location: "Germany", flag: "/de.png", price: 579 },
  { name: "PROMO-6", cpu: "AMD Ryzen 7 1700X PRO", vcpu: 8, ram: "24 ГБ", disk: "150 ГБ", diskType: "NVMe", network: "1 Гбит/с", location: "Germany", flag: "/de.png", price: 799 },
]

const vdsPlansStandard = [
  { name: "DE-1", cpu: "Intel Core i5-12500", vcpu: 1, ram: "2 ГБ", disk: "40 ГБ", diskType: "SSD", network: "1 Гбит/с", location: "Germany", flag: "/de.png", price: 149 },
  { name: "DE-2", cpu: "Intel Core i5-12500", vcpu: 2, ram: "4 ГБ", disk: "80 ГБ", diskType: "SSD", network: "1 Гбит/с", location: "Germany", flag: "/de.png", price: 319 },
  { name: "DE-3", cpu: "Intel Core i5-12500", vcpu: 4, ram: "8 ГБ", disk: "160 ГБ", diskType: "SSD", network: "1 Гбит/с", location: "Germany", flag: "/de.png", price: 520 },
  { name: "DE-4", cpu: "Intel Core i5-12500", vcpu: 6, ram: "16 ГБ", disk: "240 ГБ", diskType: "SSD", network: "1 Гбит/с", location: "Germany", flag: "/de.png", price: 859 },
  { name: "DE-5", cpu: "Intel Core i5-12500", vcpu: 8, ram: "24 ГБ", disk: "240 ГБ", diskType: "SSD", network: "1 Гбит/с", location: "Germany", flag: "/de.png", price: 1099 },
  { name: "DE-6", cpu: "Intel Core i5-12500", vcpu: 12, ram: "32 ГБ", disk: "450 ГБ", diskType: "SSD", network: "1 Гбит/с", location: "Germany", flag: "/de.png", price: 1599 },
]

const codingPlans = [
  { name: "Junior", icon: "code", vcpu: 2, ram: "4 ГБ", disk: "50 ГБ", kernelSupport: "full", port: "1 Гбит/с", price: 150 },
  { name: "Middle", icon: "code", vcpu: 4, ram: "8 ГБ", disk: "100 ГБ", kernelSupport: "full", port: "1 Гбит/с", price: 300 },
  { name: "Senior", icon: "code", vcpu: 6, ram: "16 ГБ", disk: "200 ГБ", kernelSupport: "full", port: "1 Гбит/с", price: 550 },
  { name: "Lead", icon: "code", vcpu: 8, ram: "32 ГБ", disk: "400 ГБ", kernelSupport: "full", port: "1 Гбит/с", price: 900 },
  { name: "Architect", icon: "code", vcpu: 12, ram: "64 ГБ", disk: "800 ГБ", kernelSupport: "full", port: "1 Гбит/с", price: 1500 },
]

const currencies = {
  RUB: { symbol: "₽", rate: 1, icon: RussianRuble },
  UAH: { symbol: "₴", rate: 0.45, icon: () => <span className="text-xs font-bold">₴</span> },
  USD: { symbol: "$", rate: 0.011, icon: DollarSign },
  EUR: { symbol: "€", rate: 0.010, icon: Euro },
}

type Currency = keyof typeof currencies
type VdsSubType = "standard" | "promo"
type VdsLocation = "de" | "fi"

const codingIcons: Record<string, React.ReactNode> = {
  code: <Code className="size-5 text-muted-foreground" />,
}

export function Pricing() {
  const [planType, setPlanType] = useState<"game" | "vds" | "coding">("game")
  const [currency, setCurrency] = useState<Currency>("RUB")
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 })
  const [currencyIndicatorStyle, setCurrencyIndicatorStyle] = useState({ width: 0, left: 0 })
  const [vdsSubType, setVdsSubType] = useState<VdsSubType>("promo")
  const [vdsIndicatorStyle, setVdsIndicatorStyle] = useState({ width: 0, left: 0 })
  const [vdsLocation, setVdsLocation] = useState<VdsLocation>("de")
  const [locationIndicatorStyle, setLocationIndicatorStyle] = useState({ width: 0, left: 0 })
  const tabsRef = useRef<HTMLDivElement>(null)
  const currencyRef = useRef<HTMLDivElement>(null)
  const vdsTabsRef = useRef<HTMLDivElement>(null)
  const locationRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    const type = searchParams.get('type')
    if (type === 'game' || type === 'vds' || type === 'coding') {
      setPlanType(type)
    }
  }, [searchParams])

  useEffect(() => {
    const handleSetType = (e: CustomEvent) => {
      const type = e.detail
      if (type === 'game' || type === 'vds' || type === 'coding') {
        setPlanType(type)
      }
    }
    window.addEventListener('setPricingType', handleSetType as EventListener)
    return () => window.removeEventListener('setPricingType', handleSetType as EventListener)
  }, [])

  useEffect(() => {
    const updateIndicator = () => {
      if (!tabsRef.current) return
      const activeButton = tabsRef.current.querySelector(`[data-type="${planType}"]`) as HTMLButtonElement
      if (activeButton) {
        setIndicatorStyle({
          width: activeButton.offsetWidth,
          left: activeButton.offsetLeft,
        })
      }
    }
    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [planType])

  useEffect(() => {
    const updateCurrencyIndicator = () => {
      if (!currencyRef.current) return
      const activeButton = currencyRef.current.querySelector(`[data-currency="${currency}"]`) as HTMLButtonElement
      if (activeButton) {
        setCurrencyIndicatorStyle({
          width: activeButton.offsetWidth,
          left: activeButton.offsetLeft,
        })
      }
    }
    updateCurrencyIndicator()
    window.addEventListener('resize', updateCurrencyIndicator)
    return () => window.removeEventListener('resize', updateCurrencyIndicator)
  }, [currency])

  useEffect(() => {
    const updateVdsIndicator = () => {
      if (!vdsTabsRef.current) return
      const activeButton = vdsTabsRef.current.querySelector(`[data-vds-type="${vdsSubType}"]`) as HTMLButtonElement
      if (activeButton) {
        setVdsIndicatorStyle({
          width: activeButton.offsetWidth,
          left: activeButton.offsetLeft,
        })
      }
    }
    updateVdsIndicator()
    window.addEventListener('resize', updateVdsIndicator)
    return () => window.removeEventListener('resize', updateVdsIndicator)
  }, [vdsSubType, planType])

  useEffect(() => {
    const updateLocationIndicator = () => {
      if (!locationRef.current) return
      const activeButton = locationRef.current.querySelector(`[data-location="${vdsLocation}"]`) as HTMLButtonElement
      if (activeButton) {
        setLocationIndicatorStyle({
          width: activeButton.offsetWidth,
          left: activeButton.offsetLeft,
        })
      }
    }
    updateLocationIndicator()
    window.addEventListener('resize', updateLocationIndicator)
    return () => window.removeEventListener('resize', updateLocationIndicator)
  }, [vdsLocation, planType, vdsSubType])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (data.user?.id === 'public') {
          setUser(null)
        } else {
          setUser(data.user)
        }
      }
    } catch {}
    setLoading(false)
  }

  const handleSelectPlan = () => {
    if (user) {
      router.push('/client')
    } else {
      router.push('/?auth=open')
    }
  }

  const gamePlans = publicGamePlans.map((p) => ({
    name: p.name,
    mob: p.mob,
    customImg: p.customImg,
    vcpu: p.vcpu,
    ram: p.ramText,
    disk: p.diskText,
    db: p.db,
    port: p.port,
    backups: p.backups,
    price: p.price,
  }))

  const getVdsPlans = () => {
    if (vdsSubType === "promo") return vdsPlansPromo
    return vdsPlansStandard
  }

  const plans = planType === "game" ? gamePlans : planType === "coding" ? codingPlans : getVdsPlans()
  const { symbol, rate } = currencies[currency]

  const formatPrice = (price: number) => {
    const converted = price * rate
    if (currency === "RUB") {
      return `${Math.round(converted)} ${symbol}`
    }
    return `${converted.toFixed(2)} ${symbol}`
  }

  return (
    <section id="pricing" className="scroll-mt-32 px-4 py-12 sm:px-8 sm:py-20 md:px-16 lg:px-24">
      <div className="max-w-[1320px] mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground sm:text-2xl md:text-3xl mb-1 sm:mb-2">
              Тарифы
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Выберите подходящий тариф для вашего сервера
            </p>
          </div>
          
          {/* Service and Currency Selection */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div ref={tabsRef} className="relative flex rounded-lg border border-border/50 bg-card/50 p-1 overflow-x-auto scrollbar-hide">
              <div
                className="absolute top-1 h-[calc(100%-8px)] rounded-md bg-primary transition-all duration-300 ease-out"
                style={{
                  width: indicatorStyle.width,
                  left: indicatorStyle.left,
                }}
              />
              <button
                data-type="game"
                onClick={() => setPlanType("game")}
                className={`relative z-10 flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap ${
                  planType === "game" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Server className="size-3.5 sm:size-4" />
                Minecraft
              </button>
              <button
                data-type="coding"
                onClick={() => setPlanType("coding")}
                className={`relative z-10 flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap ${
                  planType === "coding" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Code className="size-3.5 sm:size-4" />
                Coding
              </button>
              <button
                data-type="vds"
                onClick={() => setPlanType("vds")}
                className={`relative z-10 flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap ${
                  planType === "vds" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Cloud className="size-3.5 sm:size-4" />
                VDS
              </button>
            </div>

            <div ref={currencyRef} className="relative flex rounded-lg border border-border/50 bg-card/50 p-1 self-start sm:self-auto">
              <div
                className="absolute top-1 h-[calc(100%-8px)] rounded-md bg-primary transition-all duration-300 ease-out"
                style={{
                  width: currencyIndicatorStyle.width,
                  left: currencyIndicatorStyle.left,
                }}
              />
              {(Object.keys(currencies) as Currency[]).map((cur) => {
                const CurrencyIcon = currencies[cur].icon
                return (
                  <button
                    key={cur}
                    data-currency={cur}
                    onClick={() => setCurrency(cur)}
                    className={`relative z-10 flex items-center gap-1 rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium ${
                      currency === cur ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <CurrencyIcon className="size-3 sm:size-3.5" />
                    {cur}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* VDS Sub-tabs */}
        {planType === "vds" && (
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Location selector */}
            <div 
              ref={locationRef} 
              className="relative inline-flex rounded-lg border border-border/50 bg-card/50 p-1 min-h-[40px] sm:min-h-[44px] items-center"
            >
              <span className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-foreground">
                <img src="/de.png" alt="Germany" className="size-4 rounded-sm" />
                Germany
              </span>
            </div>

            {/* Plan type selector */}
            <div ref={vdsTabsRef} className="relative inline-flex rounded-lg border border-border/50 bg-card/50 p-1">
              <div
                className="absolute top-1 h-[calc(100%-8px)] rounded-md bg-primary transition-all duration-300 ease-out"
                style={{
                  width: vdsIndicatorStyle.width,
                  left: vdsIndicatorStyle.left,
                }}
              />
              <button
                data-vds-type="promo"
                onClick={() => setVdsSubType("promo")}
                className={`relative z-10 flex items-center gap-1.5 rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium ${
                  vdsSubType === "promo" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Flame className="size-3.5 sm:size-4" />
                VDS - PROMO
                <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded bg-orange-500/20 text-orange-400 font-semibold">
                  ХИТ
                </span>
              </button>
              <button
                data-vds-type="standard"
                onClick={() => setVdsSubType("standard")}
                className={`relative z-10 flex items-center gap-1.5 rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium ${
                  vdsSubType === "standard" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Zap className="size-3.5 sm:size-4" />
                VDS
              </button>
            </div>
          </div>
        )}

        {/* Pricing Grid */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, index) => (
              <div
                key={plan.name}
                className="relative rounded-xl sm:rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
              >
                {/* Promo badge - removed */}
                {/* Header */}
                <div className="p-4 sm:p-5 pb-3 sm:pb-4">
                  <div className="flex items-center gap-3">
                    {planType === "game" && "mob" in plan ? (
                      <img
                        src={(plan as typeof gamePlans[0]).customImg || `https://mc-heads.net/head/${(plan as typeof gamePlans[0]).mob}`}
                        alt={plan.name}
                        className="size-11 sm:size-12 rounded-xl"
                      />
                    ) : planType === "coding" && "icon" in plan ? (
                      <div className="flex size-11 sm:size-12 items-center justify-center rounded-xl bg-muted/50">
                        {codingIcons[(plan as typeof codingPlans[0]).icon]}
                      </div>
                    ) : (
                      <div className="flex size-11 sm:size-12 items-center justify-center rounded-xl bg-muted/50">
                        <Cloud className="size-5 sm:size-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-heading text-base sm:text-lg font-semibold text-foreground">{plan.name}</h3>
                      <span className="text-[10px] sm:text-xs text-muted-foreground/80 uppercase tracking-wider">
                        {planType === "game" ? "Minecraft" : planType === "coding" ? "Coding" : "VDS"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="border-y border-border/30 bg-muted/30 px-4 sm:px-5 py-2.5 sm:py-3">
                  <div className="flex items-baseline gap-1">
                    <span className="font-heading text-xl sm:text-2xl font-bold text-foreground transition-all duration-300">{formatPrice(plan.price)}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">/мес</span>
                  </div>
                </div>

                {/* Specs */}
                <div className="p-4 sm:p-5 pt-3 sm:pt-4">
                  <div className="space-y-2">
                    {/* CPU for VDS */}
                    {planType === "vds" && "cpu" in plan && (
                      <>
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <Cpu className="size-3.5 sm:size-4 text-muted-foreground" />
                            <span className="text-muted-foreground">CPU</span>
                          </div>
                          <span className="font-medium text-foreground bg-muted/50 px-2 py-0.5 rounded-md text-[10px] sm:text-xs">{(plan as typeof vdsPlansPromo[0]).cpu}</span>
                        </div>
                        <div className="h-px bg-border/30" />
                      </>
                    )}
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <Cpu className="size-3.5 sm:size-4 text-muted-foreground" />
                        <span className="text-muted-foreground">vCPU</span>
                      </div>
                      <span className="font-medium text-foreground bg-muted/50 px-2 py-0.5 rounded-md">{plan.vcpu}</span>
                    </div>
                    <div className="h-px bg-border/30" />
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <Server className="size-3.5 sm:size-4 text-muted-foreground" />
                        <span className="text-muted-foreground">RAM</span>
                      </div>
                      <span className="font-medium text-foreground bg-muted/50 px-2 py-0.5 rounded-md">{plan.ram}</span>
                    </div>
                    <div className="h-px bg-border/30" />
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <HardDrive className="size-3.5 sm:size-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{planType === "vds" ? (plan as typeof vdsPlansPromo[0]).diskType : "NVMe"}</span>
                      </div>
                      <span className="font-medium text-foreground bg-muted/50 px-2 py-0.5 rounded-md">{plan.disk}</span>
                    </div>
                    {planType === "game" && "db" in plan && (
                      <>
                        <div className="h-px bg-border/30" />
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <Database className="size-3.5 sm:size-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Базы данных</span>
                          </div>
                          <span className="font-medium text-foreground bg-muted/50 px-2 py-0.5 rounded-md">{(plan as typeof gamePlans[0]).db}</span>
                        </div>
                      </>
                    )}
                    <div className="h-px bg-border/30" />
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <Wifi className="size-3.5 sm:size-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Сеть</span>
                      </div>
                      <span className="font-medium text-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                        {planType === "vds" ? (plan as typeof vdsPlansPromo[0]).network : (plan as typeof gamePlans[0]).port}
                      </span>
                    </div>
                    {/* Location for VDS */}
                    {planType === "vds" && "location" in plan && (
                      <>
                        <div className="h-px bg-border/30" />
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <img src={(plan as typeof vdsPlansPromo[0]).flag} alt={(plan as typeof vdsPlansPromo[0]).location} className="size-3.5 sm:size-4 rounded-sm" />
                            <span className="text-muted-foreground">Локация</span>
                          </div>
                          <span className="font-medium text-foreground bg-muted/50 px-2 py-0.5 rounded-md">{(plan as typeof vdsPlansPromo[0]).location}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {planType === "coding" && "kernelSupport" in plan && (
                    <>
                      <div className="h-px bg-border/30 my-2" />
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <Code className="size-3.5 sm:size-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Поддержка</span>
                        </div>
                        <div className="flex gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                          <img src="/nodejs.png" alt="Node.js" className="size-4" title="Node.js" />
                          <img src="/python.png" alt="Python" className="size-4" title="Python" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Button */}
                  <div className="mt-3 sm:mt-4">
                    {loading ? (
                      <button disabled className="w-full rounded-xl border border-border/50 bg-muted/30 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-muted-foreground">
                        Загрузка...
                      </button>
                    ) : (
                      <button 
                        onClick={handleSelectPlan}
                        className="w-full rounded-xl bg-foreground py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-background flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                      >
                        {user ? (
                          <>
                            Выбрать тариф
                            <ArrowRight className="size-4" />
                          </>
                        ) : (
                          <>
                            <LogIn className="size-4" />
                            Войти и выбрать
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </section>
  )
}
