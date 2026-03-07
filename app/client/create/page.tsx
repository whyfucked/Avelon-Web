"use client"

import { CreateTab } from "../_components/tabs/create-tab"
import { useClientContext } from "../layout"

export default function CreatePage() {
  const ctx = useClientContext()

  return (
    <CreateTab
      user={ctx.user!}
      servers={ctx.servers}
      plans={ctx.plans}
      vdsPlans={ctx.vdsPlans}
      nodes={ctx.nodes}
      loadingPlans={ctx.loadingPlans}
      loadingVdsPlans={ctx.loadingVdsPlans}
      onCreateServer={ctx.onCreateServer}
      creating={ctx.creating}
      createError={ctx.createError}
      onVdsCreated={ctx.loadVdsServers}
    />
  )
}
