"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Server, Loader2, Check, ChevronRight, ChevronDown, Cloud, Code, MemoryStick, Cpu, HardDrive, Monitor, Eye, EyeOff, RefreshCw, Copy, Zap, Shield, Globe, Lock } from "lucide-react"
import { type User, type ServerData, type Plan, type VdsPlan, type Node, type Currency, type VdsOsImage, currencies, locationFlags } from "../types"
import { formatPrice, formatBytes, calculateNodeLoad } from "../utils"
import { notify } from "@/lib/notify"


const osLogos: Record<string, string> = {
  ubuntu: "https://cdn.simpleicons.org/ubuntu/E95420",
  debian: "https://cdn.simpleicons.org/debian/A81D33",
  centos: "https://raw.githubusercontent.com/devicons/devicon/master/icons/centos/centos-original.svg",
  windows: "https://raw.githubusercontent.com/devicons/devicon/master/icons/windows11/windows11-original.svg",
  alma: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/AlmaLinux_Icon_Logo.svg/960px-AlmaLinux_Icon_Logo.svg.png",
  rocky: "https://cdn.simpleicons.org/rockylinux/10B981",
}

function getOsLogo(osName: string): string | null {
  const nameLower = osName.toLowerCase()
  for (const [key, url] of Object.entries(osLogos)) {
    if (nameLower.includes(key)) return url
  }
  return null
}

function generatePassword(length: number = 16): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  let password = "aA1!"
  for (let i = 4; i < length; i++) password += chars[Math.floor(Math.random() * chars.length)]
  return password.split("").sort(() => Math.random() - 0.5).join("")
}

function generateVdsName(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let suffix = ""
  for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
  return `vds-${suffix}`
}

interface CreateTabProps {
  user: User; servers: ServerData[]; plans: Plan[]; vdsPlans: VdsPlan[]; nodes: Node[]
  loadingPlans: boolean; loadingVdsPlans: boolean
  onCreateServer: (planId: string, nodeId: string, name: string, eggId: string | null, promoCode: string | null) => Promise<void>
  creating: boolean; createError: string | null; onVdsCreated?: () => void
}

export function CreateTab({ user, plans, vdsPlans, nodes, loadingPlans, loadingVdsPlans, onCreateServer, creating, createError, onVdsCreated }: CreateTabProps) {
  const router = useRouter()
  const [currency, setCurrency] = useState<Currency>("₽")
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [selectedEggId, setSelectedEggId] = useState<string | null>(null)
  const [vdsCreating, setVdsCreating] = useState(false)
  const [vdsError, setVdsError] = useState<string | null>(null)
  const [serverName, setServerName] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("MINECRAFT")
  const [vdsSubCategory, setVdsSubCategory] = useState<string>("PROMO") // Добавляем подкатегорию для VDS
  const [vdsLocation, setVdsLocation] = useState<string>("DE") // Локация для VDS: DE или RU
  const [promoCode, setPromoCode] = useState("")
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoResult, setPromoResult] = useState<{ valid: boolean; discount?: number; message?: string } | null>(null)
  const [globalDiscount, setGlobalDiscount] = useState(0)
  const [vdsOsImages, setVdsOsImages] = useState<VdsOsImage[]>([])
  const [selectedOsId, setSelectedOsId] = useState<number | null>(null)
  const [loadingOs, setLoadingOs] = useState(false)
  const [rootPassword, setRootPassword] = useState(() => generatePassword())
  const [showPassword, setShowPassword] = useState(false)
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false)
  const [isGeneratingName, setIsGeneratingName] = useState(false)
  const [isChangingCategory, setIsChangingCategory] = useState(false)
  const [step, setStep] = useState(1)
  const [openOsDropdown, setOpenOsDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as HTMLElement)) {
        setOpenOsDropdown(null)
      }
    }
    if (openOsDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openOsDropdown])

  // Анимация генерации пароля
  const generateAnimatedPassword = useCallback(() => {
    setIsGeneratingPassword(true)
    setRootPassword('')
    
    const targetPassword = generatePassword()
    let currentIndex = 0
    
    const interval = setInterval(() => {
      if (currentIndex <= targetPassword.length) {
        setRootPassword(targetPassword.slice(0, currentIndex))
        currentIndex++
      } else {
        clearInterval(interval)
        setIsGeneratingPassword(false)
      }
    }, 30)
  }, [])

  // Анимация генерации названия
  const generateAnimatedName = useCallback(() => {
    setIsGeneratingName(true)
    setServerName('')
    
    const targetName = generateVdsName()
    let currentIndex = 0
    
    const interval = setInterval(() => {
      if (currentIndex <= targetName.length) {
        setServerName(targetName.slice(0, currentIndex))
        currentIndex++
      } else {
        clearInterval(interval)
        setIsGeneratingName(false)
      }
    }, 50)
  }, [])

  useEffect(() => { fetch("/api/settings/global-discount").then(r => r.json()).then(d => setGlobalDiscount(d.discount || 0)).catch(() => {}) }, [])
  useEffect(() => {
    if (selectedCategory === "VDS") {
      setLoadingOs(true)
      fetch("/api/vds/os-images").then(r => r.json()).then(d => { if (Array.isArray(d)) { setVdsOsImages(d); if (d.length > 0 && !selectedOsId) setSelectedOsId(d[0].vmManagerId) } }).catch(() => {}).finally(() => setLoadingOs(false))
    }
  }, [selectedCategory])

  const selectedPlanData = selectedCategory === "VDS" ? vdsPlans.find(p => p.id === selectedPlan) : plans.find(p => p.id === selectedPlan)
  const selectedVdsPlanData = selectedCategory === "VDS" ? vdsPlans.find(p => p.id === selectedPlan) : null
  const selectedGamePlanData = selectedCategory !== "VDS" ? plans.find(p => p.id === selectedPlan) : null
  const selectedNodeData = nodes.find(n => n.id === selectedNode)
  const basePrice = selectedPlanData ? selectedPlanData.price + (selectedCategory !== "VDS" ? (selectedNodeData?.priceModifier || 0) : 0) : 0
  const discount = globalDiscount > 0 ? Math.round(basePrice * (globalDiscount / 100)) : (promoResult?.valid ? promoResult.discount || 0 : 0)
  const totalPrice = Math.max(0, basePrice - discount)

  const availableEggsForPlan = selectedGamePlanData?.eggOptions?.length 
    ? selectedGamePlanData.eggOptions.map((opt: { egg: { id: string; name: string } | null }) => opt.egg).filter((e): e is { id: string; name: string } => !!e)
    : selectedGamePlanData?.egg ? [selectedGamePlanData.egg] : []

  const availableNodes = nodes.filter(node => {
    const nodeType = node.nodeType || "MINECRAFT"
    if (selectedCategory === "MINECRAFT" && nodeType !== "MINECRAFT") return false
    if (selectedCategory === "CODING" && nodeType !== "CODING") return false
    if (selectedGamePlanData?.isFree) return node.isFree && node.hasAllocations !== false
    if (selectedGamePlanData && !selectedGamePlanData.isFree) return !node.isFree
    return false
  })

  const checkPromo = async () => {
    if (!promoCode.trim() || !basePrice) return
    setPromoLoading(true); setPromoResult(null)
    try {
      const res = await fetch("/api/promo/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: promoCode, type: "discount", amount: basePrice }) })
      const data = await res.json()
      setPromoResult(res.ok && data.valid ? { valid: true, discount: data.discount, message: data.message } : { valid: false, message: data.error || "Недействителен" })
    } catch { setPromoResult({ valid: false, message: "Ошибка" }) }
    setPromoLoading(false)
  }

  const handleCreate = () => { if (selectedPlan && selectedNode && serverName.trim()) onCreateServer(selectedPlan, selectedNode, serverName.trim(), selectedEggId, promoResult?.valid ? promoCode : null) }

  const handleCreateVds = async () => {
    if (!selectedPlan || !serverName.trim() || !selectedOsId || !rootPassword) return
    if (rootPassword.length < 8) { setVdsError("Пароль минимум 8 символов"); return }
    setVdsCreating(true); setVdsError(null)
    try {
      const res = await fetch('/api/vds/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: selectedPlan, osId: selectedOsId, name: serverName.trim(), password: rootPassword }) })
      const data = await res.json()
      if (res.ok && data.success) { notify.success('VDS создан!'); router.push('/client'); onVdsCreated?.() }
      else { setVdsError(data.error || 'Ошибка'); notify.error(data.error || 'Ошибка') }
    } catch { setVdsError('Ошибка сети') }
    setVdsCreating(false)
  }

  const canStep2 = selectedPlan !== null
  const canStep3 = selectedCategory === "VDS" ? (selectedPlan && serverName.trim() && selectedOsId && rootPassword.length >= 8) : (selectedPlan && selectedNode && serverName.trim())

  if (loadingPlans || loadingVdsPlans) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>

  return (
    <div className="max-w-5xl mx-auto pb-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Создать сервер</h1>
          <p className="text-muted-foreground text-sm">Выберите тариф и настройте</p>
        </div>
        <div className="flex gap-0.5 rounded-full border border-border/50 bg-card/50 p-0.5">
          {(Object.keys(currencies) as Currency[]).map(cur => (
            <button key={cur} onClick={() => setCurrency(cur)} className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-all duration-200 ${currency === cur ? "bg-foreground text-background scale-105" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>{cur}</button>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-between mb-6">
        {[{ n: 1, l: "Тариф" }, { n: 2, l: "Настройка" }, { n: 3, l: "Оплата" }].map((s, i) => (
          <React.Fragment key={s.n}>
            <button onClick={() => { if (s.n === 1) setStep(1); else if (s.n === 2 && canStep2) setStep(2); else if (s.n === 3 && canStep3) setStep(3) }}
              disabled={s.n === 2 ? !canStep2 : s.n === 3 ? !canStep3 : false}
              className={`flex items-center gap-2 transition-all duration-300 ${(s.n === 2 && !canStep2) || (s.n === 3 && !canStep3) ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
              <div className={`size-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                step === s.n 
                  ? "bg-foreground text-background scale-110" 
                  : step > s.n 
                    ? "bg-emerald-500 text-white" 
                    : "bg-muted text-muted-foreground"
              }`}>
                {step > s.n ? <Check className="size-3.5" /> : s.n}
              </div>
              <span className={`text-sm font-medium transition-all duration-300 ${step === s.n ? "text-foreground" : step > s.n ? "text-emerald-500" : "text-muted-foreground"}`}>{s.l}</span>
            </button>
            {i < 2 && <div className={`flex-1 h-px mx-4 transition-all duration-500 ${step > s.n ? "bg-emerald-500" : "bg-border"}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1 */}
      <div className={`transition-all duration-300 ${step === 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="grid grid-cols-3 gap-4">
            {[
              { id: "MINECRAFT", icon: Server, label: "Minecraft", color: "from-emerald-500/20", image: "/client/crystalminecraft.png" },
              { id: "VDS", icon: Cloud, label: "VDS", color: "from-gray-500/20", image: "/client/crystalvdscategory.png" },
              { id: "CODING", icon: Code, label: "Coding", color: "from-purple-500/20", image: "/client/crystalcoding.png" },
            ].map((cat) => (
              <button key={cat.id} onClick={() => { 
                setIsChangingCategory(true)
                setTimeout(() => {
                  setSelectedCategory(cat.id)
                  setSelectedPlan(null)
                  setSelectedNode(null)
                  setIsChangingCategory(false)
                }, 150)
              }}
                className={`relative rounded-xl border p-3 text-left overflow-hidden transition-colors duration-200 ${selectedCategory === cat.id ? "border-foreground/30 bg-gradient-to-br " + cat.color + " to-transparent" : "border-border/50 bg-card/30 hover:border-border"}`}>
                {cat.image && <img src={cat.image} alt="" className={`absolute -right-6 -bottom-8 h-24 w-auto -rotate-12 drop-shadow-lg transition-all duration-300 ${selectedCategory === cat.id ? 'opacity-100 scale-110' : 'opacity-50 scale-100'}`} />}
                <div className={`size-8 rounded-lg flex items-center justify-center mb-2 transition-all duration-300 ${selectedCategory === cat.id ? "bg-foreground/10" : "bg-muted/50"}`}>
                  <cat.icon className={`size-4 transition-colors duration-300 ${selectedCategory === cat.id ? "text-foreground" : "text-muted-foreground"}`} />
                </div>
                <h3 className={`font-medium text-sm transition-colors duration-300 ${selectedCategory === cat.id ? "text-foreground" : "text-muted-foreground"}`}>{cat.label}</h3>
              </button>
            ))}
          </div>

          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Тарифы</h3>
            <div className={`transition-all duration-300 ${isChangingCategory ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
            {selectedCategory === "VDS" ? (
              <>
                {/* VDS Sub-categories */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <button
                    onClick={() => { 
                      setIsChangingCategory(true)
                      setTimeout(() => {
                        setVdsSubCategory("PROMO")
                        setVdsLocation("DE") // Для PROMO всегда Германия
                        setSelectedPlan(null)
                        setIsChangingCategory(false)
                      }, 150)
                    }}
                    className={`relative rounded-xl border p-3 text-left overflow-hidden transition-all duration-200 ${vdsSubCategory === "PROMO" ? "border-foreground/30 bg-gradient-to-br from-amber-500/20 to-transparent" : "border-border/50 bg-card/30 hover:border-border"}`}
                  >
                    <img src="/client/crystalvdspromo.png" alt="" className={`absolute -right-6 -bottom-8 h-24 w-auto -rotate-12 drop-shadow-lg transition-all duration-300 ${vdsSubCategory === "PROMO" ? 'opacity-100 scale-110' : 'opacity-50 scale-100'}`} />
                    <div className={`size-8 rounded-lg flex items-center justify-center mb-2 transition-all duration-300 ${vdsSubCategory === "PROMO" ? "bg-foreground/10" : "bg-muted/50"}`}>
                      <Zap className={`size-4 transition-colors duration-300 ${vdsSubCategory === "PROMO" ? "text-foreground" : "text-muted-foreground"}`} />
                    </div>
                    <h3 className={`font-medium text-sm transition-colors duration-300 ${vdsSubCategory === "PROMO" ? "text-foreground" : "text-muted-foreground"}`}>PROMO</h3>
                  </button>
                  <button
                    onClick={() => { 
                      setIsChangingCategory(true)
                      setTimeout(() => {
                        setVdsSubCategory("STANDARD")
                        setSelectedPlan(null)
                        setIsChangingCategory(false)
                      }, 150)
                    }}
                    className={`relative rounded-xl border p-3 text-left overflow-hidden transition-all duration-200 ${vdsSubCategory === "STANDARD" ? "border-foreground/30 bg-gradient-to-br from-blue-500/20 to-transparent" : "border-border/50 bg-card/30 hover:border-border"}`}
                  >
                    <img src="/client/crystalvds.png" alt="" className={`absolute -right-6 -bottom-8 h-24 w-auto -rotate-12 drop-shadow-lg transition-all duration-300 ${vdsSubCategory === "STANDARD" ? 'opacity-100 scale-110' : 'opacity-50 scale-100'}`} />
                    <div className={`size-8 rounded-lg flex items-center justify-center mb-2 transition-all duration-300 ${vdsSubCategory === "STANDARD" ? "bg-foreground/10" : "bg-muted/50"}`}>
                      <Cloud className={`size-4 transition-colors duration-300 ${vdsSubCategory === "STANDARD" ? "text-foreground" : "text-muted-foreground"}`} />
                    </div>
                    <h3 className={`font-medium text-sm transition-colors duration-300 ${vdsSubCategory === "STANDARD" ? "text-foreground" : "text-muted-foreground"}`}>VDS</h3>
                  </button>
                </div>

                {/* VDS Location Selection - только для STANDARD */}
                {vdsSubCategory === "STANDARD" && (
                  <div className="mb-4">
                    <h3 className="text-xs font-medium text-muted-foreground mb-2">Локация</h3>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setVdsLocation("DE")
                          setSelectedPlan(null)
                        }}
                        className={`flex-1 flex items-center justify-center gap-2.5 rounded-xl border px-4 py-3 transition-all duration-200 ${
                          vdsLocation === "DE" 
                            ? "border-foreground bg-foreground text-background scale-[1.02]" 
                            : "border-border/50 bg-card/30 text-foreground hover:border-border hover:bg-card/50"
                        }`}
                      >
                        <img src="/de.png" alt="Germany" className="size-5 rounded" />
                        <span className="font-medium text-sm">Germany</span>
                      </button>
                      <button
                        onClick={() => {
                          setVdsLocation("RU")
                          setSelectedPlan(null)
                        }}
                        className={`flex-1 flex items-center justify-center gap-2.5 rounded-xl border px-4 py-3 transition-all duration-200 ${
                          vdsLocation === "RU" 
                            ? "border-foreground bg-foreground text-background scale-[1.02]" 
                            : "border-border/50 bg-card/30 text-foreground hover:border-border hover:bg-card/50"
                        }`}
                      >
                        <img src="/ru.png" alt="Russia" className="size-5 rounded" />
                        <span className="font-medium text-sm">Russia</span>
                      </button>
                    </div>
                  </div>
                )}
                {vdsPlans.filter(p => {
                  const planName = p.name.toUpperCase()
                  
                  const matchesSubCategory = p.vdsType 
                    ? (vdsSubCategory === "PROMO" ? p.vdsType === "PROMO" : p.vdsType === "STANDARD")
                    : (vdsSubCategory === "PROMO" ? planName.includes("PROMO") : !planName.includes("PROMO"))
                  
                  const matchesLocation = vdsSubCategory === "PROMO"
                    ? (p.vdsLocation ? p.vdsLocation === "DE" : planName.includes("DE"))
                    : (p.vdsLocation 
                        ? p.vdsLocation === vdsLocation 
                        : (vdsLocation === "DE" ? planName.includes("DE") : planName.includes("RU")))
                  
                  return matchesSubCategory && matchesLocation
                }).length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-10 sm:py-16 animate-in fade-in duration-300">
                    <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 backdrop-blur-sm p-6 sm:p-10 text-center max-w-md">
                      <div className="flex justify-center mb-3 sm:mb-4">
                        <div className="rounded-full bg-muted/50 p-3 sm:p-4">
                          <Lock className="size-8 sm:size-10 text-foreground" />
                        </div>
                      </div>
                      <h3 className="font-heading text-lg sm:text-xl font-semibold text-foreground mb-2">
                        {vdsSubCategory === "PROMO" ? "PROMO тарифы временно недоступны" : "VDS тарифы временно недоступны"}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Мы работаем над улучшением наших VDS серверов. Скоро они станут доступны.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {vdsPlans.filter(p => {
                      // Используем поля vdsType и vdsLocation из плана, с fallback на проверку названия
                      const planName = p.name.toUpperCase()
                      
                      const matchesSubCategory = p.vdsType 
                        ? (vdsSubCategory === "PROMO" ? p.vdsType === "PROMO" : p.vdsType === "STANDARD")
                        : (vdsSubCategory === "PROMO" ? planName.includes("PROMO") : !planName.includes("PROMO"))
                      
                      const matchesLocation = vdsSubCategory === "PROMO"
                        ? (p.vdsLocation ? p.vdsLocation === "DE" : planName.includes("DE"))
                        : (p.vdsLocation 
                            ? p.vdsLocation === vdsLocation 
                            : (vdsLocation === "DE" ? planName.includes("DE") : planName.includes("RU")))
                      
                      return matchesSubCategory && matchesLocation
                    }).map((plan) => (
                    <button key={plan.id} onClick={() => setSelectedPlan(plan.id)}
                      className={`group relative text-left rounded-xl border p-4 overflow-hidden transition-colors duration-200 ${selectedPlan === plan.id ? "border-foreground/30 bg-foreground/5 ring-1 ring-foreground/20" : "border-border/50 bg-card/30 hover:border-border"}`}>
                      {/* Decorative circles */}
                      <svg className="absolute -right-8 -bottom-8 size-20" viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="39" stroke="white" strokeWidth="1"/></svg>
                      <svg className="absolute -right-4 -bottom-4 size-12" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="23" stroke="white" strokeWidth="1"/></svg>
                      <svg className="absolute -right-1 -bottom-1 size-6" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" stroke="white" strokeWidth="1"/></svg>
                      <div className="flex items-start justify-between mb-2.5">
                        <div className={`size-9 rounded-lg flex items-center justify-center ${selectedPlan === plan.id ? "bg-blue-500/20" : "bg-muted/50"}`}>
                          {plan.customIcon ? <img src={plan.customIcon} alt="" className="size-6 rounded" /> : <Cloud className={`size-4 ${selectedPlan === plan.id ? "text-blue-500" : "text-muted-foreground"}`} />}
                        </div>
                        {selectedPlan === plan.id && <div className="size-5 rounded-full bg-foreground flex items-center justify-center"><Check className="size-2.5 text-background" /></div>}
                      </div>
                      <h3 className="font-semibold text-sm text-foreground mb-0.5">{plan.name}</h3>
                      {plan.description && <p className="text-[10px] text-muted-foreground mb-2 line-clamp-2">{plan.description}</p>}
                      <div className="flex flex-wrap gap-1 mb-2.5">
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/50 text-[10px]"><Cpu className="size-2.5" />{plan.cpu} Ядро</span>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/50 text-[10px]"><MemoryStick className="size-2.5" />{Math.round(plan.ram/1024)} GB ОЗУ</span>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/50 text-[10px]"><HardDrive className="size-2.5" />{Math.round(plan.disk/1024)}GB Диск</span>
                        {(plan as any).cpuModel && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[10px] font-medium">{(plan as any).cpuModel}</span>}
                        {(plan as any).bandwidth && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-medium">{(plan as any).bandwidth}</span>}
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="font-bold text-lg text-foreground">{formatPrice(globalDiscount > 0 ? Math.round(plan.price * (1 - globalDiscount / 100)) : plan.price, currency)}</p>
                        {globalDiscount > 0 && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-500 text-white">-{globalDiscount}%</span>}
                      </div>
                    </button>
                  ))}
                </div>
                )}
              </>
            ) : (
              plans.filter(p => p.category === selectedCategory).length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-10 sm:py-16 animate-in fade-in duration-300">
                  <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 backdrop-blur-sm p-6 sm:p-10 text-center max-w-md">
                    <div className="flex justify-center mb-3 sm:mb-4">
                      <div className="rounded-full bg-muted/50 p-3 sm:p-4">
                        <Lock className="size-8 sm:size-10 text-foreground" />
                      </div>
                    </div>
                    <h3 className="font-heading text-lg sm:text-xl font-semibold text-foreground mb-2">
                      {selectedCategory === "MINECRAFT" ? "Minecraft тарифы временно недоступны" : "Coding тарифы временно недоступны"}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Мы работаем над улучшением наших серверов. Скоро они станут доступны.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {plans.filter(p => p.category === selectedCategory).map((plan) => {
                    const isCoding = selectedCategory === "CODING"
                    const accentColor = isCoding ? "purple" : "emerald"
                    return (
                    <button key={plan.id} onClick={() => { setSelectedPlan(plan.id); setSelectedNode(null); const eggs = plan.eggOptions?.length ? plan.eggOptions.map(opt => opt.egg).filter((e): e is { id: string; name: string } => !!e) : plan.egg ? [plan.egg] : []; setSelectedEggId(eggs[0]?.id ?? null) }}
                      className={`group relative text-left rounded-xl border p-4 overflow-hidden transition-colors duration-200 ${selectedPlan === plan.id ? "border-foreground/30 bg-foreground/5 ring-1 ring-foreground/20" : "border-border/50 bg-card/30 hover:border-border"}`}>
                      {/* Decorative circles */}
                      <svg className="absolute -right-8 -bottom-8 size-20" viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="39" stroke="white" strokeWidth="1"/></svg>
                      <svg className="absolute -right-4 -bottom-4 size-12" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="23" stroke="white" strokeWidth="1"/></svg>
                      <svg className="absolute -right-1 -bottom-1 size-6" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" stroke="white" strokeWidth="1"/></svg>
                      <div className="flex items-start justify-between mb-2.5">
                        <div className={`size-9 rounded-lg flex items-center justify-center ${selectedPlan === plan.id ? (isCoding ? "bg-purple-500/20" : "bg-emerald-500/20") : "bg-muted/50"}`}>
                          {plan.customIcon ? <img src={plan.customIcon} alt="" className="size-6 rounded" /> : plan.mobIcon ? <img src={`https://mc-heads.net/head/${plan.mobIcon}`} alt="" className="size-6 rounded" /> : isCoding ? <Code className={`size-4 ${selectedPlan === plan.id ? "text-purple-500" : "text-muted-foreground"}`} /> : <Server className={`size-4 ${selectedPlan === plan.id ? "text-emerald-500" : "text-muted-foreground"}`} />}
                        </div>
                        {selectedPlan === plan.id && <div className="size-5 rounded-full bg-foreground flex items-center justify-center"><Check className="size-2.5 text-background" /></div>}
                      </div>
                      <h3 className="font-semibold text-sm text-foreground mb-1">{plan.name}</h3>
                      <div className="flex flex-wrap gap-1 mb-2.5">
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/50 text-[10px]"><MemoryStick className="size-2.5" />{formatBytes(plan.ram)}</span>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/50 text-[10px]"><Cpu className="size-2.5" />{plan.cpu}%</span>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/50 text-[10px]"><HardDrive className="size-2.5" />{formatBytes(plan.disk)}</span>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="font-bold text-lg text-foreground">{formatPrice(globalDiscount > 0 ? Math.round(plan.price * (1 - globalDiscount / 100)) : plan.price, currency)}</p>
                        {globalDiscount > 0 && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-500 text-white">-{globalDiscount}%</span>}
                      </div>
                    </button>
                  )})}
                </div>
              )
            )}
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={() => setStep(2)} disabled={!canStep2} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">Далее<ChevronRight className="size-3.5" /></button>
          </div>
        </div>
      </div>

      {/* Step 2 */}
      <div className={`transition-all duration-300 ${step === 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Server className="size-3" />
                Название
              </label>
              <div className="flex gap-1.5">
                <input type="text" value={serverName} onChange={e => setServerName(e.target.value)} placeholder={selectedCategory === "VDS" ? "my-vds" : "MyServer"} maxLength={selectedCategory === "VDS" ? 10 : 32}
                  className="flex-1 rounded-lg border border-border/50 bg-card/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none" />
                {selectedCategory === "VDS" && (
                  <button type="button" onClick={generateAnimatedName} disabled={isGeneratingName} className="size-10 shrink-0 rounded-lg border border-border/50 bg-card/30 text-muted-foreground hover:text-foreground flex items-center justify-center disabled:opacity-50" title="Сгенерировать название">
                    <RefreshCw className={`size-3.5 ${isGeneratingName ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>
            </div>

            {selectedCategory !== "VDS" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Globe className="size-3" />
                  Локация
                </label>
                {availableNodes.length === 0 ? <div className="rounded-lg border border-border/50 bg-card/30 px-3 py-2.5 text-sm text-muted-foreground">Нет локаций</div> : (
                  <div className="space-y-1.5">
                    {availableNodes.slice(0, 3).map(node => {
                      const load = calculateNodeLoad(node)
                      return (
                        <button key={node.id} onClick={() => setSelectedNode(node.id)}
                          className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${selectedNode === node.id ? "border-foreground/30 bg-foreground/5" : "border-border/50 bg-card/30 hover:border-border"}`}>
                          <div className="flex items-center gap-2">
                            {node.countryCode && locationFlags[node.countryCode] ? <img src={locationFlags[node.countryCode]} alt="" className="size-4 rounded" /> : <Globe className="size-4 text-muted-foreground" />}
                            <span className="font-medium">{node.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${load > 80 ? "bg-red-500/10 text-red-500" : load > 60 ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}`}>{load}%</span>
                            {selectedNode === node.id && <Check className="size-3.5 text-foreground" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedCategory !== "VDS" && availableEggsForPlan.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Code className="size-3" />
                Ядро
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableEggsForPlan.map((egg: { id: string; name: string }) => (
                  <button key={egg.id} onClick={() => setSelectedEggId(egg.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${selectedEggId === egg.id ? "border-foreground/30 bg-foreground/10 text-foreground" : "border-border/50 bg-card/30 text-muted-foreground hover:border-border"}`}>{egg.name}</button>
                ))}
              </div>
            </div>
          )}



          {selectedCategory === "VDS" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5"><Shield className="size-3" />Пароль Root</label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input type={showPassword ? "text" : "password"} value={rootPassword} onChange={e => setRootPassword(e.target.value)} placeholder="Минимум 8 символов"
                      className="w-full rounded-lg border border-border/50 bg-card/30 px-3 py-2.5 pr-10 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</button>
                  </div>
                  <button type="button" onClick={() => navigator.clipboard.writeText(rootPassword).then(() => notify.success('Скопировано!'))} className="size-10 shrink-0 rounded-lg border border-border/50 bg-card/30 text-muted-foreground hover:text-foreground flex items-center justify-center"><Copy className="size-3.5" /></button>
                  <button type="button" onClick={generateAnimatedPassword} disabled={isGeneratingPassword} className="size-10 shrink-0 rounded-lg border border-border/50 bg-card/30 text-muted-foreground hover:text-foreground flex items-center justify-center disabled:opacity-50"><RefreshCw className={`size-3.5 ${isGeneratingPassword ? 'animate-spin' : ''}`} /></button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5"><Monitor className="size-3" />Операционная система</label>
                {loadingOs ? <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" />Загрузка...</div> : vdsOsImages.length === 0 ? <p className="text-xs text-muted-foreground">Нет ОС</p> : (
                  <div ref={dropdownRef} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(() => {
                      const groups: Record<string, typeof vdsOsImages> = {}
                      vdsOsImages.forEach(os => {
                        const name = os.name.toLowerCase()
                        let group = "Другие"
                        if (name.includes("ubuntu")) group = "Ubuntu"
                        else if (name.includes("debian")) group = "Debian"
                        else if (name.includes("centos")) group = "CentOS"
                        else if (name.includes("alma")) group = "AlmaLinux"
                        else if (name.includes("rocky")) group = "Rocky Linux"
                        else if (name.includes("windows")) group = "Windows"
                        if (!groups[group]) groups[group] = []
                        groups[group].push(os)
                      })
                      
                      const osColors: Record<string, { bg: string, border: string, selected: string }> = {
                        "Ubuntu": { bg: "from-orange-500/20 to-orange-500/5", border: "border-orange-500/30", selected: "ring-orange-500/30" },
                        "Debian": { bg: "from-red-500/20 to-red-500/5", border: "border-red-500/30", selected: "ring-red-500/30" },
                        "CentOS": { bg: "from-purple-500/20 to-purple-500/5", border: "border-purple-500/30", selected: "ring-purple-500/30" },
                        "AlmaLinux": { bg: "from-blue-500/20 to-blue-500/5", border: "border-blue-500/30", selected: "ring-blue-500/30" },
                        "Rocky Linux": { bg: "from-emerald-500/20 to-emerald-500/5", border: "border-emerald-500/30", selected: "ring-emerald-500/30" },
                        "Windows": { bg: "from-cyan-500/20 to-cyan-500/5", border: "border-cyan-500/30", selected: "ring-cyan-500/30" },
                        "Другие": { bg: "from-gray-500/20 to-gray-500/5", border: "border-gray-500/30", selected: "ring-gray-500/30" }
                      }
                      
                      const groupOrder = ["Ubuntu", "Debian", "CentOS", "AlmaLinux", "Rocky Linux", "Windows", "Другие"]
                      const sortedGroups = groupOrder.filter(g => groups[g]?.length > 0)
                      
                      return sortedGroups.map(groupName => {
                        const versions = groups[groupName].sort((a, b) => b.name.localeCompare(a.name))
                        const isSelected = versions.some(v => v.vmManagerId === selectedOsId)
                        const selectedVersion = versions.find(v => v.vmManagerId === selectedOsId)
                        const logo = getOsLogo(groupName)
                        const colors = osColors[groupName] || osColors["Другие"]
                        const isOpen = openOsDropdown === groupName
                        
                        return (
                          <div 
                            key={groupName}
                            className={`relative rounded-xl border p-3 transition-all duration-200 ${
                              isSelected 
                                ? `bg-gradient-to-br ${colors.bg} ${colors.border} ring-2 ${colors.selected}` 
                                : `border-border/50 bg-card/30 hover:bg-card/50 hover:border-border`
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-2 right-2 size-5 rounded-full bg-foreground flex items-center justify-center">
                                <Check className="size-2.5 text-background" />
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2.5 mb-2.5">
                              <div className={`size-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-muted/50'}`}>
                                {logo ? <img src={logo} alt={groupName} className="size-6 object-contain" /> : <Monitor className="size-5 text-muted-foreground" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm text-foreground truncate">{groupName}</h4>
                                <p className="text-[10px] text-muted-foreground">{versions.length} {versions.length === 1 ? 'версия' : versions.length < 5 ? 'версии' : 'версий'}</p>
                              </div>
                            </div>
                            
                            {/* Custom Select */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setOpenOsDropdown(isOpen ? null : groupName)}
                                className={`w-full flex items-center justify-between rounded-lg border px-2.5 py-2 text-xs font-medium transition-all ${
                                  isSelected 
                                    ? 'border-foreground/20 bg-background/60 text-foreground' 
                                    : 'border-border/50 bg-background/40 text-muted-foreground hover:text-foreground hover:border-border'
                                }`}
                              >
                                <span className="truncate">
                                  {selectedVersion 
                                    ? (selectedVersion.name.replace(/ubuntu|debian|centos|almalinux|rocky linux|windows/gi, '').trim() || selectedVersion.name)
                                    : 'Выбрать версию'}
                                </span>
                                <ChevronDown className={`size-3.5 shrink-0 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                              </button>
                              
                              {/* Dropdown */}
                              {isOpen && (
                                <div className="absolute z-50 w-full mt-1 rounded-lg border border-border/50 bg-card shadow-lg overflow-hidden">
                                  <div className="max-h-32 overflow-y-auto">
                                    {versions.map(v => {
                                      const versionName = v.name.replace(/ubuntu|debian|centos|almalinux|rocky linux|windows/gi, '').trim() || v.name
                                      const isVersionSelected = v.vmManagerId === selectedOsId
                                      return (
                                        <button
                                          key={v.id}
                                          type="button"
                                          onClick={() => {
                                            setSelectedOsId(v.vmManagerId)
                                            setOpenOsDropdown(null)
                                          }}
                                          className={`w-full flex items-center justify-between px-2.5 py-2 text-xs transition-colors ${
                                            isVersionSelected 
                                              ? 'bg-foreground/10 text-foreground font-medium' 
                                              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                          }`}
                                        >
                                          <span>{versionName}</span>
                                          {isVersionSelected && <Check className="size-3 text-foreground" />}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg border border-border/50 text-sm font-medium hover:bg-muted/50 transition-all duration-200">Назад</button>
            <button onClick={() => setStep(3)} disabled={!canStep3} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-50 transition-all duration-200 hover:scale-105">Далее<ChevronRight className="size-3.5" /></button>
          </div>
        </div>
      </div>

      {/* Step 3 */}
      <div className={`transition-all duration-300 ${step === 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3 space-y-3">
              <h3 className="font-heading text-sm font-semibold text-foreground">Заказ</h3>
              <div className="rounded-xl border border-border/50 bg-card/30 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${selectedCategory === "VDS" ? "bg-blue-500/10" : selectedCategory === "CODING" ? "bg-purple-500/10" : "bg-emerald-500/10"}`}>
                    {selectedCategory === "VDS" ? <Cloud className="size-5 text-blue-500" /> : selectedCategory === "CODING" ? <Code className="size-5 text-purple-500" /> : <Server className="size-5 text-emerald-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-foreground">{selectedPlanData?.name}</h4>
                    <p className="text-xs text-muted-foreground">{serverName || "Без названия"}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedCategory === "VDS" && selectedVdsPlanData ? (
                        <>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/50 text-[10px]"><Cpu className="size-2.5" />{selectedVdsPlanData.cpu}c</span>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/50 text-[10px]"><MemoryStick className="size-2.5" />{Math.round(selectedVdsPlanData.ram/1024)}G</span>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/50 text-[10px]"><HardDrive className="size-2.5" />{Math.round(selectedVdsPlanData.disk/1024)}G</span>
                        </>
                      ) : selectedPlanData ? (
                        <>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/50 text-[10px]"><MemoryStick className="size-2.5" />{formatBytes(selectedPlanData.ram)}</span>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/50 text-[10px]"><Cpu className="size-2.5" />{selectedPlanData.cpu}%</span>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/50 text-[10px]"><HardDrive className="size-2.5" />{formatBytes(selectedPlanData.disk)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/50 pt-3 space-y-1.5 text-xs">
                  {selectedCategory !== "VDS" && selectedNodeData && (
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Локация</span><span className="flex items-center gap-1.5 font-medium">{selectedNodeData.countryCode && locationFlags[selectedNodeData.countryCode] && <img src={locationFlags[selectedNodeData.countryCode]} alt="" className="size-3 rounded" />}{selectedNodeData.name}</span></div>
                  )}
                  {selectedCategory === "VDS" && selectedOsId && (
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">ОС</span><span className="flex items-center gap-1.5 font-medium">{(() => { const os = vdsOsImages.find(o => o.vmManagerId === selectedOsId); const logo = os ? getOsLogo(os.name) : null; return <>{logo && <img src={logo} alt="" className="size-3" />}{os?.name}</> })()}</span></div>
                  )}
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Период</span><span className="font-medium">30 дней</span></div>
                </div>
              </div>
              {globalDiscount === 0 && (
                <div className="rounded-xl border border-border/50 bg-card/30 p-3">
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Промокод</label>
                  <div className="flex gap-1.5">
                    <input type="text" value={promoCode} onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoResult(null) }} placeholder="PROMO" className="flex-1 rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none" />
                    <button onClick={checkPromo} disabled={promoLoading || !promoCode.trim()} className="px-3 py-2 rounded-lg bg-muted/50 text-xs font-medium hover:bg-muted disabled:opacity-50">{promoLoading ? <Loader2 className="size-3 animate-spin" /> : "OK"}</button>
                  </div>
                  {promoResult && <p className={`text-[10px] mt-1.5 ${promoResult.valid ? "text-emerald-500" : "text-red-500"}`}>{promoResult.message}</p>}
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Оплата</h3>
              <div className="rounded-xl border border-border/50 bg-card/30 p-4 sticky top-4">
                <div className="space-y-2 mb-4 text-xs">
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Тариф</span><span className="font-medium">{formatPrice(basePrice, currency)}</span></div>
                  {discount > 0 && <div className="flex items-center justify-between text-emerald-500"><span>Скидка</span><span>-{formatPrice(discount, currency)}</span></div>}
                  <div className="border-t border-border/50 pt-2"><div className="flex items-center justify-between"><span className="font-medium text-foreground">Итого</span><span className="font-bold text-xl text-foreground">{formatPrice(totalPrice, currency)}</span></div></div>
                </div>
                <div className="rounded-lg bg-muted/30 p-2.5 mb-3 text-xs">
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Баланс</span><span className={`font-medium ${user.balance >= totalPrice ? "text-emerald-500" : "text-red-500"}`}>{formatPrice(user.balance, currency)}</span></div>
                  {user.balance < totalPrice && <p className="text-[10px] text-red-500 mt-1">Недостаточно средств</p>}
                </div>
                {(createError || vdsError) && <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 mb-3"><p className="text-xs text-red-500">{createError || vdsError}</p></div>}
                <button onClick={selectedCategory === "VDS" ? handleCreateVds : handleCreate} disabled={(creating || vdsCreating) || user.balance < totalPrice || (selectedCategory === "VDS" ? !canStep3 : (!selectedNode || !serverName.trim()))}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-foreground px-4 py-3 text-sm font-semibold text-background hover:bg-foreground/90 disabled:opacity-50 transition-all duration-200">
                  {(creating || vdsCreating) ? <><Loader2 className="size-4 animate-spin" />Создание...</> : <><Zap className="size-4" />Создать</>}
                </button>
              </div>
            </div>
          </div>
          <button onClick={() => setStep(2)} className="px-4 py-2 rounded-lg border border-border/50 text-sm font-medium hover:bg-muted/50 transition-all duration-200">Назад</button>
        </div>
      </div>
    </div>
  )
}
