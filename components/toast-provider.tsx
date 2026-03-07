"use client"

import { Toaster } from "sonner"
import { CheckCircle2, XCircle, AlertCircle, Info, Loader2, X } from "lucide-react"

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      gap={10}
      expand={true}
      visibleToasts={5}
      closeButton={true}
      duration={4000}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: `
            group flex items-center gap-3 w-full max-w-[380px] px-4 py-3.5
            rounded-xl border backdrop-blur-xl shadow-2xl
            bg-background/98 border-border/60
            data-[type=success]:border-emerald-500/40 data-[type=success]:bg-emerald-500/5
            data-[type=error]:border-red-500/40 data-[type=error]:bg-red-500/5
            data-[type=warning]:border-amber-500/40 data-[type=warning]:bg-amber-500/5
            data-[type=info]:border-blue-500/40 data-[type=info]:bg-blue-500/5
            transition-all duration-300 ease-out
            hover:scale-[1.02] hover:shadow-xl
          `,
          title: "text-sm font-semibold text-foreground",
          description: "text-xs text-muted-foreground mt-0.5",
          actionButton: `
            px-3 py-1.5 text-xs font-medium rounded-lg
            bg-primary text-primary-foreground
            hover:bg-primary/90 transition-all duration-200
            hover:scale-105 active:scale-95
          `,
          cancelButton: `
            px-3 py-1.5 text-xs font-medium rounded-lg
            bg-muted text-muted-foreground
            hover:bg-muted/80 transition-all duration-200
          `,
          closeButton: `
            absolute -top-2 -right-2 p-1.5 rounded-full
            text-muted-foreground bg-background border border-border
            hover:text-foreground hover:bg-muted
            transition-all duration-200 opacity-0 group-hover:opacity-100
            hover:scale-110 active:scale-95
            shadow-md
          `,
        },
      }}
      icons={{
        success: (
          <div className="size-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
        ),
        error: (
          <div className="size-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <XCircle className="size-4 text-red-500" />
          </div>
        ),
        warning: (
          <div className="size-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            <AlertCircle className="size-4 text-amber-500" />
          </div>
        ),
        info: (
          <div className="size-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <Info className="size-4 text-blue-500" />
          </div>
        ),
        loading: (
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Loader2 className="size-4 text-primary animate-spin" />
          </div>
        ),
      }}
    />
  )
}
