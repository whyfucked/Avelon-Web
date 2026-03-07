"use client"

import { Trash2 } from "lucide-react"
import { ServerData } from "../types"
import { calculateRefund } from "../utils"

interface DeleteServerModalProps {
  server: ServerData
  deleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteServerModal({ server, deleting, onConfirm, onCancel }: DeleteServerModalProps) {
  const refund = calculateRefund(server)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" onClick={onCancel}>
      <div className="bg-card rounded-2xl p-6 w-full max-w-sm border border-border/50 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="size-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="size-6 text-red-500" />
        </div>
        <h3 className="font-heading text-lg font-bold text-foreground text-center mb-2">Удалить сервер?</h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Сервер <span className="text-foreground font-medium">{server.name}</span> будет удалён навсегда
        </p>
        
        {refund > 0 && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4 text-center">
            <p className="text-sm text-emerald-500">
              На баланс вернётся <span className="font-bold">{refund} ₽</span>
            </p>
          </div>
        )}
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-medium text-white hover:bg-red-600 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
          >
            {deleting ? 'Удаление...' : 'Удалить'}
          </button>
        </div>
      </div>
    </div>
  )
}
