"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { Navbar } from "@/components/navbar"
import { LocationsStatus } from "@/components/locations-status"
import { Pricing } from "@/components/pricing"
import { FAQ } from "@/components/faq"
import { Footer } from "@/components/footer"
import { AuthModal } from "@/components/auth-modal"
import { HeroContainer } from "@/components/hero-container"
import { FoldersAnimation } from "@/components/folders-animation"
import { Testimonials } from "@/components/testimonials"

function HomeContent() {
  const searchParams = useSearchParams()
  const [authModalOpen, setAuthModalOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('auth') === 'open') {
      setAuthModalOpen(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams])

  useEffect(() => {
    const hash = window.location.hash
    if (hash === '#pricing') {
      setTimeout(() => {
        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } else if (hash === '#faq') {
      setTimeout(() => {
        document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [])

  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })
  }

  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Background lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="absolute inset-0 w-full h-full opacity-[0.04] dark:opacity-[0.03]" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <line x1="0%" y1="15%" x2="100%" y2="85%" className="stroke-foreground" strokeWidth="1" />
          <line x1="0%" y1="35%" x2="100%" y2="100%" className="stroke-foreground" strokeWidth="1" />
          <line x1="15%" y1="0%" x2="85%" y2="100%" className="stroke-foreground" strokeWidth="1" />
          <line x1="100%" y1="25%" x2="0%" y2="95%" className="stroke-foreground" strokeWidth="1" />
          <line x1="50%" y1="0%" x2="100%" y2="50%" className="stroke-foreground" strokeWidth="1" />
          <line x1="0%" y1="55%" x2="45%" y2="100%" className="stroke-foreground" strokeWidth="1" />
          <line x1="70%" y1="0%" x2="30%" y2="100%" className="stroke-foreground" strokeWidth="1" />
          <line x1="100%" y1="60%" x2="60%" y2="100%" className="stroke-foreground" strokeWidth="1" />
        </svg>
      </div>

      <Navbar />

      {/* Hero Section */}
      <section className="relative flex min-h-[80vh] sm:min-h-screen flex-col items-center justify-center px-3 sm:px-4 pb-4 sm:pb-8 pt-20 sm:pt-24">
        <HeroContainer 
          onPricingClick={scrollToPricing}
          onFeaturesClick={scrollToFeatures}
        />
      </section>

      {/* Features Section */}
      <section id="features" className="px-3 sm:px-8 py-12 sm:py-20 md:px-16 lg:px-24">
        <div className="max-w-[1320px] mx-auto">
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground md:text-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">Наши преимущества</h2>
          
          <div className="mt-6 sm:mt-8 grid gap-3 sm:gap-4 lg:grid-cols-2">
            {/* Main feature - большая карточка */}
            <div className="relative overflow-hidden rounded-2xl sm:rounded-[32px] bg-gradient-to-br from-slate-900 to-slate-800 p-5 sm:p-8 lg:row-span-2 min-h-[280px] sm:min-h-[400px] select-none animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
              <div className="absolute inset-0 bg-[url('/new13.jpg')] bg-cover bg-center opacity-50 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex items-center justify-center -space-x-8 sm:-space-x-12">
                    <Image 
                      src="/ryzen.png" 
                      alt="AMD Ryzen" 
                      width={144} 
                      height={144} 
                      className="h-20 sm:h-28 md:h-36 w-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)] filter brightness-110" 
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                      priority
                    />
                    <Image 
                      src="/intel.png" 
                      alt="Intel" 
                      width={176} 
                      height={176} 
                      className="h-28 sm:h-36 md:h-44 w-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)] filter brightness-110" 
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                      priority
                    />
                  </div>
                </div>
                <div className="mt-auto">
                  <h3 className="font-heading text-lg sm:text-2xl font-bold text-white mb-2 sm:mb-3">Мощное железо</h3>
                  <p className="text-xs sm:text-base text-white/70 leading-relaxed max-w-md">
                    AMD Ryzen 9 и Intel Core i9 последнего поколения. NVMe SSD диски для молниеносной загрузки миров и плагинов без лагов.
                  </p>
                </div>
              </div>
            </div>

            {/* Anti-DDoS */}
            <div className="relative overflow-hidden rounded-2xl sm:rounded-[32px] border border-border/30 bg-slate-900 p-4 sm:p-6 min-h-[140px] sm:min-h-[190px] select-none animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
              <div className="absolute inset-0 bg-[url('/antiddos.png')] bg-cover bg-center opacity-90 pointer-events-none" />
              <div className="absolute inset-0 bg-black/10 pointer-events-none" />
              <div className="relative z-10 flex items-center h-full">
                <div>
                  <h3 className="font-heading text-base sm:text-xl font-bold text-white mb-1.5 sm:mb-2">Защита от DDoS</h3>
                  <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                    Многоуровневая защита фильтрует вредоносный трафик. Ваши игроки заходят без проблем, а боты остаются за бортом. 
                    Разрабатываем собственную систему защиты IT-GUARD.FUN - скоро будет готова!
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
              {/* Team */}
              <div className="relative overflow-hidden rounded-2xl sm:rounded-[32px] bg-slate-900 p-4 sm:p-6 min-h-[140px] sm:min-h-[180px] select-none">
                <div className="absolute inset-0 bg-[url('/support.png')] bg-cover bg-center opacity-70 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />
                <Image 
                  src="/help.webp" 
                  alt="Support" 
                  width={200} 
                  height={200} 
                  className="absolute -right-6 sm:-right-8 -bottom-2 sm:-bottom-4 h-full w-auto object-cover z-10 opacity-90" 
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
                <div className="relative z-10 flex flex-col h-full justify-end">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <div className="size-6 sm:size-8 rounded-md sm:rounded-lg bg-white/10 flex items-center justify-center">
                      <svg className="size-3 sm:size-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-white/60">24/7</span>
                  </div>
                  <h3 className="font-heading text-sm sm:text-lg font-bold text-white">Поддержка</h3>
                  <p className="text-[10px] sm:text-xs text-white/60 mt-0.5 sm:mt-1 italic hidden sm:block">
                    У нас в поддержке стоит сам «Умный человек в очках скачать обои»
                  </p>
                </div>
              </div>

              {/* Simplicity */}
              <div className="relative overflow-hidden rounded-2xl sm:rounded-[32px] bg-slate-900 p-4 sm:p-6 min-h-[140px] sm:min-h-[180px] select-none">
                <div className="absolute inset-0 bg-[url('/prostota.jpg')] bg-cover bg-center opacity-70 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div className="flex items-center justify-center pt-1 sm:pt-2">
                    <FoldersAnimation />
                  </div>
                  <div>
                    <h3 className="font-heading text-sm sm:text-lg font-bold text-white">Простота</h3>
                    <p className="text-[10px] sm:text-xs text-white/60 mt-0.5 sm:mt-1 hidden sm:block">
                      Создать сервер у нас — как создать новую папку на рабочем столе
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Testimonials />

      <Pricing />

      <section className="py-12 sm:py-20">
        <LocationsStatus />
      </section>

      <section className="py-12 sm:py-20">
        <FAQ />
      </section>

      <Footer />

      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        onSuccess={() => {
          setAuthModalOpen(false)
          window.location.href = '/client'
        }}
      />
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
