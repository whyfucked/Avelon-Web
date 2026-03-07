import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { testConnection } from "@/lib/pterodactyl"

let lastCheck = 0
const CHECK_INTERVAL = 100 * 1000

async function checkWebStatus(
  url: string
): Promise<{ isOnline: boolean; responseTime: number | null }> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    })

    clearTimeout(timeout)
    const responseTime = Date.now() - start

    return {
      isOnline: response.ok || response.status < 500,
      responseTime,
    }
  } catch {
    return { isOnline: false, responseTime: null }
  }
}

async function checkPterodactylStatus(): Promise<{
  isOnline: boolean
  responseTime: number | null
}> {
  const start = Date.now()
  try {
    const result = await testConnection()
    const responseTime = Date.now() - start
    return {
      isOnline: result.connected,
      responseTime,
    }
  } catch {
    return { isOnline: false, responseTime: null }
  }
}

async function checkNodeStatus(
  fqdn: string | null
): Promise<{ isOnline: boolean; responseTime: number | null }> {
  if (!fqdn) return { isOnline: false, responseTime: null }

  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    await fetch(`https://${fqdn}:8080`, {
      method: "GET",
      signal: controller.signal,
    })

    clearTimeout(timeout)
    const responseTime = Date.now() - start

    return { isOnline: true, responseTime }
  } catch (error: any) {
    const responseTime = Date.now() - start
    if (
      error?.cause?.code === "ECONNREFUSED" ||
      error?.name === "AbortError"
    ) {
      return { isOnline: false, responseTime: null }
    }
    if (responseTime < 5000) {
      return { isOnline: true, responseTime }
    }
    return { isOnline: false, responseTime: null }
  }
}

async function checkRouterStatus(
  ip: string | null,
  port: number | null
): Promise<{ isOnline: boolean; responseTime: number | null }> {
  if (!ip) return { isOnline: false, responseTime: null }

  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    await fetch(`http://${ip}:${port || 80}`, {
      method: "HEAD",
      signal: controller.signal,
    })

    clearTimeout(timeout)
    const responseTime = Date.now() - start
    return { isOnline: true, responseTime }
  } catch (error: any) {
    const responseTime = Date.now() - start
    if (responseTime < 5000 && error?.name !== "AbortError") {
      return { isOnline: true, responseTime }
    }
    return { isOnline: false, responseTime: null }
  }
}

async function runStatusChecks() {
  const now = Date.now()
  if (now - lastCheck < CHECK_INTERVAL) {
    return
  }
  lastCheck = now

  try {
    const statuses = await prisma.serviceStatus.findMany({
      include: { node: true },
    })

    for (const status of statuses) {
      let checkResult: { isOnline: boolean; responseTime: number | null }

      if (status.type === "WEB") {
        if (status.url) {
          checkResult = await checkWebStatus(status.url)
        } else {
          checkResult = await checkWebStatus(
            process.env.NEXT_PUBLIC_APP_URL || "https://yourdomain.ru"
          )
        }
      } else if (status.type === "GAME") {
        checkResult = await checkPterodactylStatus()
      } else if (status.type === "NODE" && status.node) {
        checkResult = await checkNodeStatus(status.node.fqdn)
      } else if (status.type === "ROUTER") {
        checkResult = await checkRouterStatus(status.routerIp, status.routerPort)
      } else {
        checkResult = { isOnline: false, responseTime: null }
      }

      await prisma.serviceStatus.update({
        where: { id: status.id },
        data: {
          isOnline: checkResult.isOnline,
          responseTime: checkResult.responseTime,
          lastCheck: new Date(),
        },
      })

      await prisma.uptimeHistory.create({
        data: {
          serviceId: status.id,
          isOnline: checkResult.isOnline,
          responseTime: checkResult.responseTime,
        },
      })
    }

    const oldHistory = new Date()
    oldHistory.setDate(oldHistory.getDate() - 30)
    await prisma.uptimeHistory.deleteMany({
      where: { checkedAt: { lt: oldHistory } },
    })
  } catch (error) {
    console.error("Status check error:", error)
  }
}

export async function GET() {
  runStatusChecks()

  try {
    const statuses = await prisma.serviceStatus.findMany({
      include: {
        node: {
          select: {
            name: true,
            locationName: true,
            countryCode: true,
          },
        },
        history: {
          orderBy: { checkedAt: "desc" },
          take: 288,
          select: {
            isOnline: true,
            responseTime: true,
            checkedAt: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    })

    const result = statuses.map((status) => {
      const totalChecks = status.history.length
      const onlineChecks = status.history.filter((h) => h.isOnline).length
      const uptime = totalChecks > 0 ? (onlineChecks / totalChecks) * 100 : 100

      const avgResponseTime =
        status.history.length > 0
          ? Math.round(
              status.history
                .filter((h) => h.responseTime !== null)
                .reduce((acc, h) => acc + (h.responseTime || 0), 0) /
                status.history.filter((h) => h.responseTime !== null).length
            )
          : null

      return {
        id: status.id,
        name: status.name,
        type: status.type,
        isOnline: status.isOnline,
        lastCheck: status.lastCheck,
        responseTime: status.responseTime,
        uptime: Math.round(uptime * 100) / 100,
        avgResponseTime,
        node: status.node,
        history: status.history.slice(0, 48).map((h) => ({
          isOnline: h.isOnline,
          responseTime: h.responseTime,
          checkedAt: h.checkedAt,
        })),
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Failed to fetch public statuses:", error)
    return NextResponse.json(
      { error: "Failed to fetch statuses" },
      { status: 500 }
    )
  }
}
