"use client"

import { useEffect, useState } from "react"

export function SnowEffect() {
  const [enabled, setEnabled] = useState(false)
  const [snowflakes, setSnowflakes] = useState<{ id: number; left: number; delay: number; duration: number; size: number; opacity: number }[]>([])

  useEffect(() => {
    fetch("/api/settings/snow")
      .then((res) => res.json())
      .then((data) => {
        setEnabled(data.enabled)
        if (data.enabled) {
          const flakes = Array.from({ length: 15 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 10,
            duration: 10 + Math.random() * 15,
            size: 12 + Math.random() * 18,
            opacity: 0.5 + Math.random() * 0.4,
          }))
          setSnowflakes(flakes)
        }
      })
      .catch(() => {})
  }, [])

  if (!enabled) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {snowflakes.map((flake) => (
        <svg
          key={flake.id}
          className="absolute text-white"
          style={{
            left: `${flake.left}%`,
            top: `-30px`,
            width: flake.size,
            height: flake.size,
            opacity: flake.opacity,
            animation: `snowfall ${flake.duration}s linear ${flake.delay}s infinite`,
          }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="2" x2="22" y1="12" y2="12" />
          <line x1="12" x2="12" y1="2" y2="22" />
          <path d="m20 16-4-4 4-4" />
          <path d="m4 8 4 4-4 4" />
          <path d="m16 4-4 4-4-4" />
          <path d="m8 20 4-4 4 4" />
        </svg>
      ))}
      <style jsx global>{`
        @keyframes snowfall {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
          }
          25% {
            transform: translateY(25vh) translateX(15px) rotate(90deg);
          }
          50% {
            transform: translateY(50vh) translateX(-15px) rotate(180deg);
          }
          75% {
            transform: translateY(75vh) translateX(10px) rotate(270deg);
          }
          100% {
            transform: translateY(105vh) translateX(0) rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
