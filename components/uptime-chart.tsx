"use client"

import { useEffect, useState } from "react"

interface DayData {
  date: string
  dateKey: string
  uptime: number | null
  status: "full" | "good" | "degraded" | "incident" | "nodata"
  hasData: boolean
}

interface UptimeData {
  days: DayData[]
  avgUptime: number | null
  currentStatus: "operational" | "degraded" | "outage"
  onlineCount: number
  totalCount: number
}

export function UptimeChart() {
  const [data, setData] = useState<UptimeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null)

  useEffect(() => {
    const fetchUptime = async () => {
      try {
        const res = await fetch('/api/status/uptime')
        if (res.ok) {
          const result = await res.json()
          setData(result)
        }
      } catch (error) {
        console.error('Failed to fetch uptime:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUptime()
  }, [])

  const statusColors = {
    full: "bg-emerald-500",
    good: "bg-emerald-500",
    degraded: "bg-amber-500",
    incident: "bg-red-500",
    nodata: "bg-muted/50",
  }

  const statusText = {
    full: "Работает",
    good: "Работает",
    degraded: "Проблемы",
    incident: "Инцидент",
    nodata: "Нет данных",
  }

  if (loading) {
    return (
      <div className="rounded-xl sm:rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-3 sm:p-5">
        <div className="animate-pulse">
          <div className="h-3 sm:h-4 w-32 sm:w-40 bg-muted rounded mb-3 sm:mb-4" />
          <div className="flex gap-1 sm:gap-1.5">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="flex-1 h-8 sm:h-10 bg-muted/50 rounded-sm" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="rounded-xl sm:rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-3 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <span className="text-xs sm:text-sm text-muted-foreground">История доступности (14 дней)</span>
        {data.avgUptime !== null && (
          <span className="text-xs sm:text-sm">
            <span className="text-muted-foreground">Uptime: </span>
            <span className="font-medium text-foreground">{data.avgUptime.toFixed(2)}%</span>
          </span>
        )}
      </div>

      <div className="relative">
        <div className="flex gap-1 sm:gap-1.5">
          {data.days.map((day, idx) => (
            <div
              key={idx}
              className="relative flex-1 group"
              onMouseEnter={() => setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <div 
                className={`h-8 sm:h-10 rounded-sm ${statusColors[day.status]} ${day.hasData ? 'hover:opacity-80 cursor-pointer' : ''} transition-opacity`}
              />
              
              {hoveredDay === day && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
                  <div className="bg-popover border border-border rounded-lg shadow-lg px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                    <p className="text-[10px] sm:text-xs font-medium text-foreground">{day.date}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {statusText[day.status]}
                      {day.uptime !== null && ` · ${day.uptime.toFixed(1)}%`}
                    </p>
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 sm:mt-3 text-[10px] sm:text-xs text-muted-foreground">
        <span>14 дней назад</span>
        <span>Сегодня</span>
      </div>
    </div>
  )
}
