"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ConfigurePage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace("/client/create")
  }, [router])
  
  return null
}
