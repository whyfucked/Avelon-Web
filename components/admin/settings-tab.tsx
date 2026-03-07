"use client"

import { useState } from "react"
import { notify } from "@/lib/notify"
import { CustomSelect } from "./custom-select"
import { Plan, Egg, PromoCode } from "./types"
import { 
  Plus, Trash2, Edit, Save, Eye, EyeOff, Gift
} from "lucide-react"

interface SettingsTabProps {
  plans: Plan[]
  eggs: Egg[]
  promos: PromoCode[]
  globalDiscount: number
  snowEnabled: boolean
  maintenanceMode: boolean
  serverCreationDisabled: boolean
  onLoadPlans: () => void
  onLoadPromos: () => void
}

export function SettingsTab({
  plans, eggs, promos, globalDiscount: initialDiscount, snowEnabled: initialSnow,
  maintenanceMode: initialMaintenance, serverCreationDisabled: initialServerDisabled,
  onLoadPlans, onLoadPromos
}: SettingsTabProps) {
  const [showNewPromo, setShowNewPromo] = useState(false)
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null)
  const [discount, setDiscount] = useState(initialDiscount)
  const [snow, setSnow] = useState(initialSnow)
  const [maintenance, setMaintenance] = useState(initialMaintenance)
  const [serverDisabled, setServerDisabled] = useState(initialServerDisabled)
  const [selectedBulkEgg, setSelectedBulkEgg] = useState("")
  const [selectedRemoveEgg, setSelectedRemoveEgg] = useState("")
  const [newPromoType, setNewPromoType] = useState<'DISCOUNT' | 'BALANCE'>('DISCOUNT')

  const saveGlobalDiscount = async (value: number) => {
    try {
      const r = await fetch('/api/admin/settings', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ key: 'globalDiscount', value: value.toString() }) 
      })
      if (r.ok) { setDiscount(value); notify.success('Скидка сохранена') }
    } catch {}
  }

  const saveSnowEnabled = async (enabled: boolean) => {
    try {
      const r = await fetch('/api/admin/settings', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ key: 'snowEnabled', value: enabled.toString() }) 
      })
      if (r.ok) { setSnow(enabled); notify.success(enabled ? 'Снег включён' : 'Снег выключен') }
    } catch {}
  }

  const saveMaintenanceMode = async (enabled: boolean) => {
    try {
      const r = await fetch('/api/admin/settings', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ key: 'maintenanceMode', value: enabled.toString() }) 
      })
      if (r.ok) { setMaintenance(enabled); notify.success(enabled ? 'Технические работы включены' : 'Технические работы выключены') }
    } catch {}
  }

  const saveServerCreationDisabled = async (disabled: boolean) => {
    try {
      const r = await fetch('/api/admin/settings', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ key: 'serverCreationDisabled', value: disabled.toString() }) 
      })
      if (r.ok) { setServerDisabled(disabled); notify.success(disabled ? 'Создание серверов отключено' : 'Создание серверов включено') }
    } catch {}
  }

  const savePromo = async (promo: Partial<PromoCode>) => {
    try {
      const r = await fetch('/api/admin/promos', { 
        method: promo.id ? 'PATCH' : 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(promo) 
      })
      if (r.ok) { 
        onLoadPromos()
        setShowNewPromo(false)
        setEditingPromo(null)
        notify.success(promo.id ? 'Промокод обновлён' : 'Промокод создан') 
      } else { 
        const d = await r.json()
        notify.error(d.error || 'Ошибка') 
      }
    } catch {}
  }

  const deletePromo = async (id: string) => {
    if (!confirm('Удалить промокод?')) return
    try {
      const r = await fetch(`/api/admin/promos?id=${id}`, { method: 'DELETE' })
      if (r.ok) { onLoadPromos(); notify.success('Промокод удалён') }
    } catch {}
  }

  const addEggToPlans = async () => {
    if (!selectedBulkEgg) { notify.error('Выберите ядро'); return }
    const checkboxes = document.querySelectorAll<HTMLInputElement>('input[name="bulk-plan-checkbox"]:checked')
    const selectedPlanIds = Array.from(checkboxes).map(cb => cb.value)
    if (selectedPlanIds.length === 0) { notify.error('Выберите хотя бы один тариф'); return }
    
    let successCount = 0
    for (const planId of selectedPlanIds) {
      const plan = plans.find(p => p.id === planId)
      if (!plan) continue
      const currentEggIds = plan.eggOptions?.map(opt => opt.eggId) || []
      if (currentEggIds.includes(selectedBulkEgg)) continue
      const newEggIds = [...currentEggIds, selectedBulkEgg]
      try {
        const r = await fetch('/api/admin/plans', { 
          method: 'PATCH', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ id: planId, allowedEggIds: newEggIds }) 
        })
        if (r.ok) successCount++
      } catch {}
    }
    onLoadPlans()
    if (successCount > 0) notify.success(`Ядро добавлено к ${successCount} тарифам`)
  }

  const removeEggFromPlans = async () => {
    if (!selectedRemoveEgg) { notify.error('Выберите ядро'); return }
    let successCount = 0
    for (const plan of plans) {
      const currentEggIds = plan.eggOptions?.map(opt => opt.eggId) || []
      if (!currentEggIds.includes(selectedRemoveEgg)) continue
      const newEggIds = currentEggIds.filter(id => id !== selectedRemoveEgg)
      try {
        const r = await fetch('/api/admin/plans', { 
          method: 'PATCH', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ id: plan.id, allowedEggIds: newEggIds }) 
        })
        if (r.ok) successCount++
      } catch {}
    }
    onLoadPlans()
    if (successCount > 0) notify.success(`Ядро удалено из ${successCount} тарифов`)
    else notify.info('Это ядро не было привязано ни к одному тарифу')
  }

  const eggOptions = eggs.filter(e => e.isActive).map(egg => ({
    value: egg.id,
    label: egg.name,
    sublabel: egg.nestName || undefined
  }))

  const allEggOptions = eggs.map(egg => ({
    value: egg.id,
    label: egg.name,
    sublabel: egg.nestName || undefined
  }))

  const hasMinecraftPlans = plans.some(p => p.category !== 'VDS')

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">Настройки</h1>

      {/* Grid layout для плашек */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Глобальная скидка */}
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col">
          <h3 className="font-medium text-foreground">Глобальная скидка</h3>
          <p className="text-sm text-muted-foreground mt-1">Процент скидки на все тарифы</p>
          <div className="flex gap-3 mt-4">
            <input 
              type="number" 
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              min="0" 
              max="100" 
              className="flex-1 px-4 py-2.5 rounded-xl bg-accent border border-border text-sm text-foreground focus:outline-none" 
            />
            <button
              onClick={() => {
                if (discount < 0 || discount > 100) { notify.error('Скидка должна быть от 0 до 100%'); return }
                saveGlobalDiscount(discount)
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              <Save className="size-4" />
            </button>
          </div>
          {discount > 0 && <p className="mt-3 text-sm text-emerald-500 font-medium">Действует скидка {discount}%</p>}
        </div>

        {/* Визуальные эффекты */}
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col">
          <h3 className="font-medium text-foreground">Визуальные эффекты</h3>
          <p className="text-sm text-muted-foreground mt-1">Дополнительные эффекты на сайте</p>
          <div className="flex items-center justify-between mt-4 p-3 rounded-xl bg-accent/50 border border-border">
            <div>
              <p className="text-sm text-foreground">Снег на сайте</p>
              <p className="text-xs text-muted-foreground">Падающие снежинки</p>
            </div>
            <button
              onClick={() => saveSnowEnabled(!snow)}
              className={`relative w-12 h-6 rounded-full transition-colors ${snow ? 'bg-blue-500' : 'bg-muted'}`}
            >
              <span className={`absolute top-1 size-4 rounded-full bg-white transition-transform shadow-sm ${snow ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Технические работы - занимает всю ширину */}
        <div className="lg:col-span-2 rounded-2xl border border-red-500/20 bg-card p-6">
          <h3 className="font-medium text-foreground">Технические работы</h3>
          <p className="text-sm text-muted-foreground mt-1">Режим обслуживания сайта</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-accent/50 border border-border">
              <div>
                <p className="text-sm text-foreground">Режим техработ</p>
                <p className="text-xs text-muted-foreground">Показывать заглушку</p>
              </div>
              <button
                onClick={() => saveMaintenanceMode(!maintenance)}
                className={`relative w-12 h-6 rounded-full transition-colors ${maintenance ? 'bg-red-500' : 'bg-muted'}`}
              >
                <span className={`absolute top-1 size-4 rounded-full bg-white transition-transform shadow-sm ${maintenance ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-accent/50 border border-border">
              <div>
                <p className="text-sm text-foreground">Создание серверов</p>
                <p className="text-xs text-muted-foreground">Запретить создание</p>
              </div>
              <button
                onClick={() => saveServerCreationDisabled(!serverDisabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${serverDisabled ? 'bg-amber-500' : 'bg-muted'}`}
              >
                <span className={`absolute top-1 size-4 rounded-full bg-white transition-transform shadow-sm ${serverDisabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>

          {maintenance && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-500 font-medium">⚠️ Режим техработ активен!</p>
            </div>
          )}
        </div>
      </div>

      {/* Управление ядрами */}
      {hasMinecraftPlans && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Добавить ядро */}
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col">
            <h3 className="font-medium text-foreground">Добавить ядро к тарифам</h3>
            <p className="text-sm text-muted-foreground mt-1">Массовое добавление ядра</p>
            
            <div className="flex flex-col flex-1 space-y-4 mt-4">
              <CustomSelect
                options={eggOptions}
                value={selectedBulkEgg}
                onChange={setSelectedBulkEgg}
                placeholder="Выберите ядро"
              />

              <div className="flex-1 min-h-[160px] max-h-40 overflow-y-auto rounded-xl bg-background/50 border border-border p-2 space-y-1">
                {plans.map((plan) => (
                  <label key={plan.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                    <input type="checkbox" name="bulk-plan-checkbox" value={plan.id} defaultChecked className="size-4 rounded border-border accent-amber-500" />
                    <span className="text-sm text-foreground">{plan.name}</span>
                    <span className="text-xs text-muted-foreground">({plan.category})</span>
                  </label>
                ))}
                {plans.length === 0 && (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    Нет тарифов
                  </div>
                )}
              </div>

              <button
                onClick={addEggToPlans}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
              >
                <Plus className="size-4" />
                Добавить ядро
              </button>
            </div>
          </div>

          {/* Удалить ядро */}
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col">
            <h3 className="font-medium text-foreground">Удалить ядро из тарифов</h3>
            <p className="text-sm text-muted-foreground mt-1">Массовое удаление ядра</p>
            
            <div className="flex flex-col flex-1 space-y-4 mt-4">
              <CustomSelect
                options={allEggOptions}
                value={selectedRemoveEgg}
                onChange={setSelectedRemoveEgg}
                placeholder="Выберите ядро"
              />

              <div className="flex-1 min-h-[160px] rounded-xl bg-background/50 border border-border p-4 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Trash2 className="size-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Выберите ядро для удаления</p>
                  <p className="text-xs mt-1">Ядро будет удалено из всех тарифов</p>
                </div>
              </div>

              <button
                onClick={removeEggFromPlans}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition-colors"
              >
                <Trash2 className="size-4" />
                Удалить из всех
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Промокоды */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Gift className="size-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Промокоды</h3>
              <p className="text-sm text-muted-foreground">Скидки и бонусы на баланс</p>
            </div>
          </div>
          <button 
            onClick={() => setShowNewPromo(true)} 
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            <Plus className="size-4" />
            Новый
          </button>
        </div>

        {showNewPromo && (
          <div className="mb-6 p-4 rounded-xl bg-accent/30 border border-border">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const formData = new FormData(form)
                savePromo({
                  code: formData.get('code') as string,
                  type: newPromoType,
                  value: parseFloat(formData.get('value') as string),
                  maxUses: formData.get('maxUses') ? parseInt(formData.get('maxUses') as string) : null,
                  minAmount: formData.get('minAmount') ? parseFloat(formData.get('minAmount') as string) : null,
                  expiresAt: formData.get('expiresAt') as string || null,
                  isActive: true,
                })
                setNewPromoType('DISCOUNT')
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <input type="text" name="code" required placeholder="Код промокода" className="px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-primary/20" />
                <CustomSelect
                  options={[
                    { value: 'DISCOUNT', label: 'Скидка (%)' },
                    { value: 'BALANCE', label: 'Баланс (₽)' }
                  ]}
                  value={newPromoType}
                  onChange={(v) => setNewPromoType(v as 'DISCOUNT' | 'BALANCE')}
                  placeholder="Тип"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <input type="number" name="value" required min="0" step="0.01" placeholder="Значение" className="px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
                <input type="number" name="maxUses" min="1" placeholder="Макс. исп." className="px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
                <input type="datetime-local" name="expiresAt" className="px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors">Создать</button>
                <button type="button" onClick={() => { setShowNewPromo(false); setNewPromoType('DISCOUNT') }} className="px-4 py-2.5 rounded-xl bg-accent text-muted-foreground text-sm hover:bg-accent/80 transition-colors">Отмена</button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promos.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-12">
              <Gift className="size-12 mx-auto mb-3 opacity-30" />
              <p>Промокодов пока нет</p>
            </div>
          ) : (
            promos.map((promo) => (
              <div 
                key={promo.id} 
                className={`relative rounded-xl border p-4 transition-all hover:shadow-lg ${
                  promo.isActive 
                    ? 'bg-card border-border' 
                    : 'bg-red-500/5 border-red-500/20 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground tracking-wider">{promo.code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      promo.type === 'DISCOUNT' ? 'bg-blue-500/20 text-blue-500' : 'bg-emerald-500/20 text-emerald-500'
                    }`}>
                      {promo.type === 'DISCOUNT' ? `${promo.value}%` : `${promo.value} ₽`}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  {promo._count.usages}{promo.maxUses ? ` / ${promo.maxUses}` : ''} использований
                </p>
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setEditingPromo(promo)} 
                    className="flex-1 py-2 rounded-lg flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Edit className="size-4" />
                  </button>
                  <button 
                    onClick={() => savePromo({ id: promo.id, isActive: !promo.isActive })} 
                    className={`flex-1 py-2 rounded-lg flex items-center justify-center transition-colors ${
                      promo.isActive ? 'hover:bg-red-500/20 text-red-500' : 'hover:bg-emerald-500/20 text-emerald-500'
                    }`}
                  >
                    {promo.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                  <button 
                    onClick={() => deletePromo(promo.id)} 
                    className="flex-1 py-2 rounded-lg flex items-center justify-center hover:bg-red-500/20 text-red-500 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Модальное окно редактирования промокода */}
      {editingPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6">
            <h3 className="font-medium text-foreground mb-4">Редактировать промокод</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const formData = new FormData(form)
                savePromo({
                  id: editingPromo.id,
                  code: formData.get('code') as string,
                  type: formData.get('type') as 'DISCOUNT' | 'BALANCE',
                  value: parseFloat(formData.get('value') as string),
                  maxUses: formData.get('maxUses') ? parseInt(formData.get('maxUses') as string) : null,
                  expiresAt: formData.get('expiresAt') as string || null,
                })
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" 
                  name="code" 
                  required 
                  defaultValue={editingPromo.code}
                  placeholder="Код" 
                  className="px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-primary/20" 
                />
                <select 
                  name="type" 
                  required 
                  defaultValue={editingPromo.type}
                  className="px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none"
                >
                  <option value="DISCOUNT">Скидка (%)</option>
                  <option value="BALANCE">Баланс (₽)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="number" 
                  name="value" 
                  required 
                  min="0" 
                  step="0.01" 
                  defaultValue={editingPromo.value}
                  placeholder="Значение" 
                  className="px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" 
                />
                <input 
                  type="number" 
                  name="maxUses" 
                  min="1" 
                  defaultValue={editingPromo.maxUses || ''}
                  placeholder="Макс. исп." 
                  className="px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" 
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors">
                  Сохранить
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingPromo(null)} 
                  className="px-4 py-2.5 rounded-xl bg-accent text-muted-foreground text-sm hover:bg-accent/80 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
