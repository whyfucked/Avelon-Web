"use client"

import { useClientContext } from "./layout"
import { DashboardTab } from "./_components"

export default function ClientPage() {
  const ctx = useClientContext()
  
  return (
    <DashboardTab
      user={ctx.user}
      servers={ctx.servers}
      vdsServers={ctx.vdsServers}
    />
  )
}
