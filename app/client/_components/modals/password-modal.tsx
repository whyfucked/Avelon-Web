"use client"

import { Loader2 } from "lucide-react"

interface PasswordModalProps {
  form: { current: string; new: string; confirm: string }
  setForm: (form: { current: string; new: string; confirm: string }) => void
  loading: boolean
  error: string | null
  onSubmit: () => void
  onClose: () => void
}

export function PasswordModal({ form, setForm, loading, error, onSubmit, onClose }: PasswordModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-card rounded-2xl p-6 w-full max-w-sm border border-border/50 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <h3 className="font-heading text-lg font-bold text-foreground mb-4">Смена пароля</h3>
        
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Текущий пароль</label>
            <input 
              type="password"
              value={form.current}
              onChange={(e) => setForm({ ...form, current: e.target.value })}
              className="w-full mt-2 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none transition-all duration-200"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Новый пароль</label>
            <input 
              type="password"
              value={form.new}
              onChange={(e) => setForm({ ...form, new: e.target.value })}
              className="w-full mt-2 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none transition-all duration-200"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Подтвердите пароль</label>
            <input 
              type="password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              className="w-full mt-2 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none transition-all duration-200"
            />
          </div>
        </div>
        
        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border/50 text-sm text-foreground hover:bg-muted/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Отмена
          </button>
          <button
            onClick={onSubmit}
            disabled={loading || !form.current || !form.new || !form.confirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : 'Сменить'}
          </button>
        </div>
      </div>
    </div>
  )
}
