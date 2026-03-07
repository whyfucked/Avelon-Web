"use client"

import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="size-9 rounded-xl">
        <div className="size-5" />
        <span className="sr-only">Переключить тему</span>
      </Button>
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9 rounded-xl relative overflow-hidden"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <div className="relative size-5">
        <Sun
          className={`size-5 absolute inset-0 transition-all duration-[1500ms] ease-in-out ${
            isDark ? "rotate-180 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
          }`}
        />
        <Moon
          className={`size-5 absolute inset-0 transition-all duration-[1500ms] ease-in-out ${
            isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-180 scale-0 opacity-0"
          }`}
        />
      </div>
      <span className="sr-only">Переключить тему</span>
    </Button>
  )
}
