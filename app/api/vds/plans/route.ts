/**
 * VDS Plans API
 * Отдельный endpoint для VDS тарифов с характеристиками из VMManager6
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getVmManager } from '@/vm6/VmManager'

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: { 
        isActive: true,
        category: 'VDS'
      },
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    })

    if (plans.length === 0) {
      return NextResponse.json([])
    }

    // Обрабатываем каждый план
    const vdsPlans = await Promise.all(plans.map(async (plan) => {
      console.log(`[VDS Plans API] Processing plan ${plan.name}:`, {
        vmPresetId: plan.vmPresetId,
        hasCustomSpecs: !!plan.vdsCustomSpecs,
        cpu: plan.cpu,
        ram: plan.ram,
        disk: plan.disk
      })

      // Шаг 1: Пытаемся получить данные из пресета VMManager6
      let presetData: { cpu: number; ram: number; disk: number; bandwidth: number | null } | null = null
      
      if (plan.vmPresetId) {
        try {
          const vm = getVmManager()
          const preset = await vm.getPreset(plan.vmPresetId)
          
          if (preset) {
            const totalDiskMib = preset.disks?.reduce((sum: number, disk: any) => sum + (disk.size_mib || 0), 0) || 0
            const cpuCores = preset.cpu_number || 0
            const ramMib = preset.ram_mib || 0
            
            presetData = {
              cpu: cpuCores,
              ram: ramMib,
              disk: totalDiskMib,
              bandwidth: preset.net_out_mbitps || null
            }
            
            console.log(`[VDS Plans API] Preset ${plan.vmPresetId} specs:`, presetData)
          }
        } catch (e) {
          console.error(`[VDS Plans API] Failed to fetch preset ${plan.vmPresetId}:`, e)
        }
      }

      // Шаг 2: Парсим кастомные спеки если есть
      let customSpecs: any = null
      if (plan.vdsCustomSpecs) {
        try {
          customSpecs = JSON.parse(plan.vdsCustomSpecs)
        } catch (e) {
          console.error(`[VDS Plans API] Failed to parse custom specs for plan ${plan.id}:`, e)
        }
      }

      // Шаг 3: Определяем финальные характеристики (приоритет: preset > plan)
      const cpu = presetData?.cpu || plan.cpu
      const ram = presetData?.ram || plan.ram
      const disk = presetData?.disk || plan.disk
      const bandwidth = presetData?.bandwidth || customSpecs?.network || null

      console.log(`[VDS Plans API] Final specs for ${plan.name}:`, {
        cpu,
        ram,
        disk,
        bandwidth,
        source: presetData ? 'preset' : 'plan'
      })

      // Шаг 4: Формируем ответ
      return {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        price: plan.price,
        // Характеристики (в MiB, конвертация в GB на фронтенде)
        cpu,  // ядра
        ram,  // MiB
        disk,  // MiB
        bandwidth,  // Mbit/s
        // Дополнительная информация из customSpecs
        cpuModel: customSpecs?.cpuModel || null,
        location: customSpecs?.location || null,
        vdsType: customSpecs?.vdsType || 'STANDARD',
        vdsLocation: customSpecs?.vdsLocation || 'DE',
        city: customSpecs?.city || null,
        country: customSpecs?.country || null,
        // VMManager6 IDs
        vmPresetId: plan.vmPresetId,
        vmClusterId: plan.vmClusterId,
        vmNodeId: plan.vmNodeId,
        vmNodeStrategy: plan.vmNodeStrategy,
        vmIpPoolId: plan.vmIpPoolId,
        customIcon: plan.customIcon,
        isActive: plan.isActive,
        isCustom: !!customSpecs
      }
    }))

    return NextResponse.json(vdsPlans)
  } catch (error) {
    console.error('[VDS Plans API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch VDS plans' }, { status: 500 })
  }
}
