"use client"

import { Children, isValidElement, useEffect, useMemo, useRef, useState } from "react"

type ScrambledTextProps = {
  children: React.ReactNode
  className?: string
  duration?: number
  speed?: number
  radius?: number
  scrambleChars?: string
}

const DEFAULT_SCRAMBLE_CHARS = "!<>-_\\/[]{}—=+*^?#________.:"

const randomChar = (chars: string) => {
  if (!chars.length) return ""
  return chars[Math.floor(Math.random() * chars.length)] ?? ""
}

export function ScrambledText({
  children,
  className,
  duration = 1.2,
  speed = 0.5,
  radius = 80,
  scrambleChars = DEFAULT_SCRAMBLE_CHARS,
}: ScrambledTextProps) {
  const text = useMemo(() => {
    const array = Children.toArray(children)

    return array
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") {
          return String(child)
        }

        if (isValidElement(child)) {
          const props = child.props as { children?: unknown }
          if (typeof props.children === "string") {
            return props.children
          }
        }

        return ""
      })
      .join("")
  }, [children])

  const [display, setDisplay] = useState(() => text)
  const frameRef = useRef<number>(0)
  const animationRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    frameRef.current = 0
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    const length = text.length
    if (length === 0) {
      setDisplay("")
      return
    }

    setDisplay(" ".repeat(length))

    const totalFrames = Math.max(12, Math.round(duration * 60))
    const scrambleWindow = Math.max(6, Math.round(speed * 40))
    const offsetUnit = Math.max(1, Math.round(radius / Math.max(1, length)))

    const queue = Array.from({ length }, (_, index) => {
      const start = Math.floor(Math.random() * scrambleWindow + index * offsetUnit * 0.3)
      const end = start + totalFrames
      return { to: text[index], start, end, char: "" }
    })

    const animate = () => {
      let output = ""
      let completed = 0

      queue.forEach((item) => {
        if (frameRef.current >= item.end) {
          output += item.to
          completed += 1
        } else if (frameRef.current >= item.start) {
          if (item.char === "" || Math.random() < 0.28) {
            item.char = randomChar(scrambleChars)
          }
          output += item.char
        } else {
          output += " "
        }
      })

      setDisplay(output)
      frameRef.current += 1

      if (completed < queue.length) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setDisplay(text)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [duration, radius, scrambleChars, speed, text])

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const combinedClassName = ["relative inline-flex", className].filter(Boolean).join(" ")

  return (
    <span className={combinedClassName} aria-live="polite" aria-atomic="true">
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{text}</span>
    </span>
  )
}

export default ScrambledText
