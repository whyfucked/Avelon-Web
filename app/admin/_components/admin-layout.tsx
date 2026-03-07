"use client"

import { useState, useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { AdminHeader, type Tab } from "./admin-header"
import { AdminSidebar } from "./admin-sidebar"

interface AdminLayoutProps {
  children: (props: {
    activeTab: Tab
    setActiveTab: (tab: Tab) => void
    searchQuery: string
    setSearchQuery: (query: string) => void
    isAuthorized: boolean | null
  }) => ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("dashboard")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) {
          setIsAuthorized(false)
          router.push('/client')
          return
        }
        const data = await res.json()
        if (data.user?.role !== 'ADMIN') {
          setIsAuthorized(false)
          router.push('/client')
          return
        }
        setIsAuthorized(true)
      } catch {
        setIsAuthorized(false)
        router.push('/client')
      }
    }
    checkAuth()
  }, [router])

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Проверка доступа...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      {/* Optional sidebar for larger screens */}
      {/* <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} /> */}
      
      <main className="max-w-7xl mx-auto px-4 pt-24 pb-12">
        {children({ 
          activeTab, 
          setActiveTab, 
          searchQuery, 
          setSearchQuery,
          isAuthorized 
        })}
      </main>
    </div>
  )
}

// Re-export Tab type for convenience
export type { Tab } from "./admin-header"
