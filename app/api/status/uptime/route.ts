import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const history = await prisma.uptimeHistory.findMany({
      where: {
        checkedAt: {
          gte: fourteenDaysAgo,
        },
      },
      select: {
        isOnline: true,
        checkedAt: true,
      },
      orderBy: {
        checkedAt: "asc",
      },
    })

    const dayMap = new Map<string, { total: number; online: number }>()

    history.forEach((h: { isOnline: boolean; checkedAt: Date }) => {
      const dateKey = h.checkedAt.toISOString().split("T")[0]
      const existing = dayMap.get(dateKey) || { total: 0, online: 0 }
      existing.total++
      if (h.isOnline) existing.online++
      dayMap.set(dateKey, existing)
    })

    const days = []
    let totalUptime = 0
    let daysWithData = 0

    for (let i = 13; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split("T")[0]

      const dayData = dayMap.get(dateKey)
      let uptime: number | null = null
      let hasData = false

      if (dayData && dayData.total > 0) {
        uptime = (dayData.online / dayData.total) * 100
        hasData = true
        totalUptime += uptime
        daysWithData++
      }

      let status: "full" | "good" | "degraded" | "incident" | "nodata" = "nodata"
      if (hasData && uptime !== null) {
        if (uptime >= 100) status = "full"
        else if (uptime >= 99.5) status = "good"
        else if (uptime >= 99) status = "degraded"
        else status = "incident"
      }

      days.push({
        date: date.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" }),
        dateKey,
        uptime: uptime !== null ? Math.round(uptime * 100) / 100 : null,
        status,
        hasData,
      })
    }

    const avgUptime = daysWithData > 0 ? totalUptime / daysWithData : null

    const allOnline = await prisma.serviceStatus.findMany({
      select: { isOnline: true }
    })
    const onlineCount = allOnline.filter(s => s.isOnline).length
    const totalCount = allOnline.length
    
    let currentStatus: "operational" | "degraded" | "outage" = "operational"
    if (totalCount > 0) {
      const onlinePercent = (onlineCount / totalCount) * 100
      if (onlinePercent < 100) currentStatus = "degraded"
      if (onlinePercent < 50) currentStatus = "outage"
    }

    return NextResponse.json({
      days,
      avgUptime: avgUptime !== null ? Math.round(avgUptime * 100) / 100 : null,
      currentStatus,
      onlineCount,
      totalCount,
    })
  } catch (error) {
    console.error("Failed to fetch uptime history:", error)
    return NextResponse.json({ error: "Failed to fetch uptime" }, { status: 500 })
  }
}
