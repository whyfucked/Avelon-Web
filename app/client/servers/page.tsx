"use client"

import { useClientContext } from "../layout"
import { ServersTab } from "../_components"

export default function ServersPage() {
  const ctx = useClientContext()
  
  return (
    <ServersTab
      user={ctx.user}
      servers={ctx.servers}
      vdsServers={ctx.vdsServers}
      loadingServers={ctx.loadingServers}
      loadingVds={ctx.loadingVds}
      expandedServerId={ctx.expandedServerId}
      setExpandedServerId={ctx.setExpandedServerId}
      onDeleteClick={ctx.onDeleteClick}
      onRenewServer={ctx.onRenewServer}
      renewingServerId={ctx.renewingServerId}
      osImages={ctx.osImages}
      onReinstallVds={ctx.onReinstallVds}
      reinstallingVdsId={ctx.reinstallingVdsId}
      onRenewVds={ctx.onRenewVds}
      renewingVdsId={ctx.renewingVdsId}
    />
  )
}
