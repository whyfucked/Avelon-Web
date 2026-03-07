"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

export function MaintenanceCheck() {
  const pathname = usePathname()
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const checkMaintenance = async () => {
      // Пропускаем проверку для админки
      if (pathname?.startsWith('/admin')) {
        setChecked(true)
        return
      }

      try {
        const res = await fetch('/api/settings/maintenance')
        if (res.ok) {
          const data = await res.json()
          
          // Если тех. работы выключены
          if (!data.maintenanceMode) {
            document.cookie = 'maintenance-mode=false; path=/'
            // Если мы на странице тех. работ, но они выключены — редирект на главную
            if (pathname === '/maintenance') {
              router.push('/')
              return
            }
            setChecked(true)
            return
          }
          
          // Тех. работы включены
          document.cookie = 'maintenance-mode=true; path=/'
          
          // Если уже на странице тех. работ — ничего не делаем
          if (pathname === '/maintenance') {
            setChecked(true)
            return
          }
          
          const authRes = await fetch('/api/auth/me')
          if (authRes.ok) {
            const authData = await authRes.json()
            if (authData.user?.role !== 'ADMIN') {
              router.push('/maintenance')
              return
            }
          } else {
            router.push('/maintenance')
            return
          }
        }
        setChecked(true)
      } catch (error) {
        console.error('Failed to check maintenance mode:', error)
        // При ошибке пропускаем проверку и показываем сайт
        setChecked(true)
      }
    }

    checkMaintenance()
  }, [pathname, router])

  return null
}
