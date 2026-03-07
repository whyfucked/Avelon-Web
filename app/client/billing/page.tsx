"use client"

import { useClientContext } from "../layout"
import { BillingTab } from "../_components"

export default function BillingPage() {
  const ctx = useClientContext()
  
  return <BillingTab user={ctx.user} servers={ctx.servers} />
}
