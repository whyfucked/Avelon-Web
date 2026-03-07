"use client"

import { useState, useCallback } from "react"
import { Terminal, X, Check, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface StartupCommandModalProps {
  serverId: string
  serverName: string
  currentPreset?: string | null
  currentCommand?: string | null
  onClose: () => void
  onSuccess: () => void
}

const PRESETS = [
  {
    id: 'default',
    name: 'По умолчанию',
    description: 'G1GC + базовая оптимизация',
    command: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}',
  },
  {
    id: 'akira',
    name: "Akira's Flags",
    description: 'Максимальная оптимизация',
    command: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M --add-modules=jdk.incubator.vector -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 -Dusing.aikars.flags=https://mcflags.emc.gs -Daikars.new.flags=true -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 -jar {{SERVER_JARFILE}}',
  },
  {
    id: 'velocity',
    name: 'Velocity/BungeeCord',
    description: 'Оптимизация для прокси',
    command: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -XX:+UseG1GC -XX:G1HeapRegionSize=4M -XX:+UnlockExperimentalVMOptions -XX:+ParallelRefProcEnabled -XX:+AlwaysPreTouch -XX:MaxInlineLevel=15 -jar {{SERVER_JARFILE}}',
  },
  {
    id: 'custom',
    name: 'Кастомная',
    description: 'Своя команда запуска',
    command: '',
  },
]

export function StartupCommandModal({
  serverId,
  serverName,
  currentPreset,
  currentCommand,
  onClose,
  onSuccess,
}: StartupCommandModalProps) {
  const [selectedPreset, setSelectedPreset] = useState(currentPreset || 'default')
  const [customCommand, setCustomCommand] = useState(currentCommand || '')
  const [isClosing, setIsClosing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 150)
  }, [onClose])

  const handleSave = useCallback(async () => {
    if (selectedPreset === 'custom' && !customCommand.trim()) {
      toast.error('Введите кастомную команду')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/servers/${serverId}/startup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset: selectedPreset,
          customCommand: selectedPreset === 'custom' ? customCommand : undefined,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast.success('Команда запуска обновлена!')
        onSuccess()
        handleClose()
      } else {
        toast.error(data.error || 'Не удалось обновить команду')
      }
    } catch (error) {
      console.error('Startup command update error:', error)
      toast.error('Ошибка при обновлении команды')
    } finally {
      setIsSaving(false)
    }
  }, [serverId, selectedPreset, customCommand, onSuccess, handleClose])

  const selectedPresetData = PRESETS.find(p => p.id === selectedPreset)
  const displayCommand = selectedPreset === 'custom' 
    ? customCommand 
    : selectedPresetData?.command || ''

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ${
        isClosing ? 'animate-out fade-out duration-150' : 'animate-in fade-in duration-200'
      }`}
      onClick={handleClose}
    >
      <div 
        className={`bg-card border border-border rounded-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col ${
          isClosing ? 'animate-out zoom-out-95 duration-150' : 'animate-in zoom-in-95 duration-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Terminal className="size-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">Команда запуска</h3>
              <p className="text-xs text-muted-foreground">Сервер: {serverName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="size-8 rounded-lg hover:bg-muted/50 flex items-center justify-center transition-colors"
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Warning */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 flex gap-3">
            <AlertCircle className="size-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-amber-500 font-medium mb-1">Важно!</p>
              <p className="text-amber-500/80">
                Изменение команды запуска может повлиять на работу сервера. 
                Для применения изменений потребуется перезапуск сервера.
              </p>
            </div>
          </div>

          {/* Presets */}
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">
              Выберите пресет:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.id
                return (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset.id)}
                    className={`relative rounded-xl border p-4 text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-blue-500/50 bg-blue-500/10 ring-2 ring-blue-500/20'
                        : 'border-border/50 bg-card/30 hover:bg-card/50 hover:border-border'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 size-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check className="size-3 text-white" />
                      </div>
                    )}
                    <h4 className="font-semibold text-foreground mb-1">{preset.name}</h4>
                    <p className="text-xs text-muted-foreground">{preset.description}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom Command Input */}
          {selectedPreset === 'custom' && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Кастомная команда:
              </label>
              <textarea
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                placeholder="java -Xms128M -Xmx{{SERVER_MEMORY}}M [ваши флаги] -jar {{SERVER_JARFILE}}"
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Обязательно используйте <code className="px-1.5 py-0.5 rounded bg-muted/50">-jar {'{{SERVER_JARFILE}}'}</code>
              </p>
              <p className="text-xs text-red-500 mt-1">
                Запрещены: -cp, --classpath, -javaagent и команды оболочки
              </p>
            </div>
          )}

          {/* Command Preview */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Предпросмотр команды:
            </label>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 max-h-32 overflow-y-auto">
              <code className="text-xs text-foreground font-mono break-all whitespace-pre-wrap">
                {displayCommand || 'Выберите пресет или введите команду'}
              </code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border/50">
          <button
            onClick={handleClose}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-all duration-200"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || (selectedPreset === 'custom' && !customCommand.trim())}
            className="flex-1 rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white hover:bg-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin mx-auto" />
            ) : (
              'Сохранить'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
