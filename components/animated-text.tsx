"use client"

import { useEffect, useState } from "react"
import { Unbounded } from "next/font/google"
import { Gamepad2, Server, Monitor, Cpu } from "lucide-react"

const unbounded = Unbounded({ subsets: ["latin", "cyrillic"] })

const services = [
  { text: "Minecraft сервера", icon: Gamepad2 },
  { text: "Coding сервера", icon: Server },
  { text: "VDS сервера", icon: Monitor },
  { text: "Выделенные сервера", icon: Cpu },
]

export function AnimatedText() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [displayText, setDisplayText] = useState("")
  const [phase, setPhase] = useState<"typing" | "waiting" | "deleting" | "iconOut" | "switching">("typing")
  const [iconOpacity, setIconOpacity] = useState(1)

  useEffect(() => {
    const currentService = services[currentIndex].text
    
    let timeout: NodeJS.Timeout

    switch (phase) {
      case "typing":
        if (displayText.length < currentService.length) {
          timeout = setTimeout(() => {
            setDisplayText(currentService.slice(0, displayText.length + 1))
          }, 80)
        } else {
          timeout = setTimeout(() => setPhase("waiting"), 100)
        }
        break
      
      case "waiting":
        timeout = setTimeout(() => setPhase("deleting"), 2000)
        break
      
      case "deleting":
        if (displayText.length > 0) {
          timeout = setTimeout(() => {
            setDisplayText(displayText.slice(0, -1))
          }, 40)
        } else {
          setPhase("iconOut")
        }
        break
      
      case "iconOut":
        setIconOpacity(0)
        timeout = setTimeout(() => setPhase("switching"), 150)
        break
      
      case "switching":
        setCurrentIndex((prev) => (prev + 1) % services.length)
        setIconOpacity(1)
        setPhase("typing")
        break
    }

    return () => clearTimeout(timeout)
  }, [displayText, phase, currentIndex])

  const CurrentIcon = services[currentIndex].icon

  return (
    <div className={`${unbounded.className} flex items-center gap-2`}>
      <span className="text-muted-foreground">У нас есть</span>
      <CurrentIcon 
        className="size-5 text-foreground transition-opacity duration-150" 
        style={{ opacity: iconOpacity }}
      />
      <span className="text-foreground">
        {displayText}
        <span className="animate-pulse">|</span>
      </span>
    </div>
  )
}
