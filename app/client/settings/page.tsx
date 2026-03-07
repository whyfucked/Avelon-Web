"use client"

import { useClientContext } from "../layout"
import { SettingsTab } from "../_components"

export default function SettingsPage() {
  const ctx = useClientContext()
  
  return (
    <SettingsTab
      user={ctx.user}
      pteroAccount={ctx.pteroAccount}
      pteroLoading={ctx.pteroLoading}
      pteroPassword={ctx.pteroPassword}
      showPteroPassword={ctx.showPteroPassword}
      setShowPteroPassword={ctx.setShowPteroPassword}
      onCreatePteroAccount={ctx.onCreatePteroAccount}
      onResetPteroPassword={ctx.onResetPteroPassword}
      onShowPasswordModal={ctx.onShowPasswordModal}
      onCopyToClipboard={ctx.onCopyToClipboard}
      onShowDeleteAccountModal={ctx.onShowDeleteAccountModal}
      onResendVerification={ctx.onResendVerification}
      verificationLoading={ctx.verificationLoading}
    />
  )
}
