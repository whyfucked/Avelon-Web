"use client"

import { ChevronDown } from "lucide-react"
import { useEffect, useState } from "react"

export function ScrollArrow() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  if (!isVisible) return null

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
      <ChevronDown className="size-10 text-muted-foreground" />
    </div>
  )
}
