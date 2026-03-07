import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAdminAuth } from "@/lib/auth-admin"

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const statuses = await prisma.serviceStatus.findMany()
    
    if (statuses.length === 0) {
      return NextResponse.json({ error: "No services found" }, { status: 400 })
    }

    let created = 0

    for (const status of statuses) {
      for (let day = 13; day >= 0; day--) {
        const checksPerDay = 24
        
        for (let hour = 0; hour < checksPerDay; hour++) {
          const date = new Date()
          date.setDate(date.getDate() - day)
          date.setHours(hour, Math.floor(Math.random() * 60), 0, 0)

          const isOnline = Math.random() > 0.02
          const responseTime = isOnline ? Math.floor(Math.random() * 150) + 20 : null

          await prisma.uptimeHistory.create({
            data: {
              serviceId: status.id,
              isOnline,
              responseTime,
              checkedAt: date,
            },
          })
          created++
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      created,
      services: statuses.length,
      days: 14 
    })
  } catch (error) {
    console.error("Failed to fill history:", error)
    return NextResponse.json({ error: "Failed to fill history" }, { status: 500 })
  }
}
