/**
 * User VDS API
 * Получение VDS серверов пользователя из VMManager6
 */

import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { getVMManager6API } from '@/vm6/vmmanager6'
import { getVMManager6Rentals } from '@/vm6/vmmanager6-rentals'
import { prisma } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const VMMANAGER_PANEL_URL = process.env.VMMANAGER6_PANEL_URL || 'https://vmmanager.space'

interface AuthPayload {
  userId: string
  email: string
  role: string
}

function getAuthFromRequest(request: NextRequest): AuthPayload | null {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return null
    return jwt.verify(token, JWT_SECRET) as AuthPayload
  } catch {
    return null
  }
}

// GET - получить VDS серверы пользователя
export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const vmAPI = getVMManager6API()
    const allRentals = getVMManager6Rentals(auth.userId)
    
    const rentals = allRentals.filter(r => r.status !== 'deleted')

    let osImages: Array<{ vmManagerId: number; name: string }> = []
    try {
      osImages = await prisma.vdsOsImage.findMany({
        select: { vmManagerId: true, name: true }
      })
    } catch (e) {
      console.error('[User VDS] Failed to fetch OS images from DB:', e)
    }

    let vdsPlansData: Array<{ name: string; ram: number; cpu: number; disk: number }> = []
    try {
      const dbPlans = await prisma.plan.findMany({
        where: { category: 'VDS', vmPresetId: { not: null } },
        select: { name: true, vmPresetId: true }
      })
      
      console.log('[User VDS] Found DB plans:', dbPlans.length)
      
      // Получаем пресеты из VMManager6
      const presets = await vmAPI.getPresets()
      console.log('[User VDS] Found presets:', presets.length)
      
      // Маппим планы с характеристиками из пресетов
      vdsPlansData = dbPlans.map(plan => {
        const preset = presets.find(p => p.id === plan.vmPresetId)
        const totalDiskMib = preset?.disks?.reduce((sum, disk) => sum + (disk.size_mib || 0), 0) || 0
        const planData = {
          name: plan.name,
          ram: preset?.ram_mib || 0, // в MiB
          cpu: preset?.cpu_number || 0,
          disk: totalDiskMib // в MiB
        }
        console.log('[User VDS] Mapped plan:', planData)
        return planData
      })
      
      console.log('[User VDS] Total VDS plans with specs:', vdsPlansData.length)
    } catch (e) {
      console.error('[User VDS] Failed to fetch VDS plans:', e)
    }

    // Получаем данные каждого сервера из VMManager6
    const servers = await Promise.all(
      rentals.map(async (rental) => {
        try {
          const host = await vmAPI.getVm(rental.vmmanager6_host_id)
          
          // Получаем IP адреса отдельным запросом если их нет в основном ответе
          let ipv4List = host.ip4 || []
          if (ipv4List.length === 0) {
            try {
              ipv4List = await vmAPI.getVmIPv4(rental.vmmanager6_host_id)
            } catch (e) {
              // Игнорируем ошибку получения IP
            }
          }
          
          const osId = typeof host.os === 'object' ? host.os.id : host.os
          const osImage = osImages.find(os => os.vmManagerId === osId)
          
          // IP адреса из VMManager6 - проверяем все возможные форматы
          const ipAddresses: string[] = []
          
          // Формат 1: ip4 массив (основной формат VMManager6)
          if (Array.isArray(ipv4List)) {
            for (const ip of ipv4List) {
              // VMManager6 может возвращать ip в разных полях: ip, ip_addr, name
              const addr = (ip as any).ip || (ip as any).ip_addr || (ip as any).name
              if (addr) ipAddresses.push(addr)
            }
          }
          
          // Формат 2: ip6 массив
          if (Array.isArray(host.ip6)) {
            for (const ip of host.ip6) {
              const addr = (ip as any).ip || (ip as any).ip_addr || ip.name
              if (addr) ipAddresses.push(addr)
            }
          }
          
          // Формат 3: ip массив (альтернативный формат)
          if (Array.isArray(host.ip) && ipAddresses.length === 0) {
            for (const ip of host.ip) {
              const addr = (ip as any).ip || (ip as any).ip_addr || ip.name
              if (addr) ipAddresses.push(addr)
            }
          }

          // Извлекаем характеристики - VMManager6 может возвращать в разных форматах
          // CPU - VMManager6 возвращает cpu_number (количество ядер)
          const cpuValue = host.cpu_number || host.cpu || 0
          
          // RAM - VMManager6 возвращает ram_mib (в MiB)
          const ramValue = host.ram_mib || host.ram || 0
          
          // Disk - стандартизированное извлечение (в MiB)
          let diskValue = 0
          
          // Вариант 1: disk как объект с size_mib
          if (typeof host.disk === 'object' && host.disk) {
            diskValue = (host.disk as any).size_mib || (host.disk as any).disk_mib || 0
          }
          // Вариант 2: disk_info объект
          else if (host.disk_info) {
            diskValue = host.disk_info.size_mib || host.disk_info.disk_mib || 0
          }
          // Вариант 3: прямое поле disk_mib
          else if (host.disk_mib) {
            diskValue = host.disk_mib
          }
          // Вариант 4: disk как число (предполагаем MiB если > 1000, иначе GiB)
          else if (typeof host.disk === 'number' && host.disk > 0) {
            diskValue = host.disk > 1000 ? host.disk : host.disk * 1024
          }
          
          console.log('[User VDS] Disk value after parsing:', diskValue)
          
          // Если диск не получен из основного ответа - пробуем получить из пресета
          if (diskValue === 0 && host.preset) {
            try {
              const preset = await vmAPI.getPreset(host.preset)
              if (preset && preset.disks && preset.disks.length > 0) {
                // Суммируем все диски из пресета
                diskValue = preset.disks.reduce((sum, disk) => sum + disk.size_mib, 0)
                console.log('[User VDS] Disk from preset:', diskValue)
              }
            } catch (e: any) {
              console.log('[User VDS] Failed to get preset:', e?.message)
            }
          }
          
          // Bandwidth - VMManager6 возвращает net_bandwidth_mbitps
          const bandwidth = host.net_bandwidth_mbitps || (host as any).bandwidth || null
          
          // Если данные не получены из VMManager6, берём из плана (пресета)
          const plan = vdsPlansData.find(p => p.name === rental.plan_name)
          
          const finalCpu = cpuValue || plan?.cpu || 0
          const finalRam = ramValue || plan?.ram || 0 // уже в MiB
          // Для диска: если из VMManager6 не получили, берём из пресета
          const finalDisk = diskValue || plan?.disk || 0 // уже в MiB
          
          console.log('[User VDS] Final specs:', {
            hostId: host.id,
            cpu: finalCpu,
            ram: finalRam,
            disk: finalDisk,
            bandwidth,
            source: cpuValue ? 'vmmanager6' : 'plan'
          })

          return {
            id: rental.id,
            vmmanager6_host_id: rental.vmmanager6_host_id,
            name: host.name || `VDS-${rental.vmmanager6_host_id}`,
            status: host.state || 'unknown',
            ip_addresses: ipAddresses,
            ip_address: ipAddresses[0] || null,
            os: typeof host.os === 'object' ? host.os.id : host.os,
            osName: osImage?.name || `OS #${typeof host.os === 'object' ? host.os.id : host.os}`,
            // Характеристики (конвертируем MiB -> GB для фронтенда)
            cpu: finalCpu,
            ram: finalRam ? Math.round(finalRam / 1024) : 0,  // MiB -> GB
            disk: finalDisk ? Math.round(finalDisk / 1024) : 0,  // MiB -> GB
            bandwidth: bandwidth,  // Mbit/s
            // Raw values для отладки
            rawRam: finalRam,
            rawDisk: finalDisk,
            // Данные аренды
            planName: rental.plan_name,
            price: rental.rental_price,
            expiresAt: rental.expires_at,
            autoRenew: rental.auto_renew,
            rentalStatus: rental.status,
            // URLs
            panelUrl: `${VMMANAGER_PANEL_URL}/vm/host/${rental.vmmanager6_host_id}`,
          }
        } catch (error: any) {
          // Тихо обрабатываем ошибку "Host id unknown" - хост был удалён из VMManager
          const isHostUnknown = error?.message?.includes('Host id unknown') || 
                                error?.message?.includes('5021')
          if (!isHostUnknown) {
            console.error(`[User VDS] Failed to get host ${rental.vmmanager6_host_id}:`, error)
          }
          // Возвращаем данные из аренды если VMManager6 недоступен или хост удалён
          return {
            id: rental.id,
            vmmanager6_host_id: rental.vmmanager6_host_id,
            name: `VDS-${rental.vmmanager6_host_id}`,
            status: isHostUnknown ? 'deleted' : 'unknown',
            ip_addresses: [],
            ip_address: null,
            os: 0,
            osName: 'Unknown',
            ram: 0,
            cpu: 0,
            disk: 0,
            planName: rental.plan_name,
            price: rental.rental_price,
            expiresAt: rental.expires_at,
            autoRenew: rental.auto_renew,
            rentalStatus: rental.status,
            panelUrl: `${VMMANAGER_PANEL_URL}/vm/host/${rental.vmmanager6_host_id}`,
          }
        }
      })
    )

    return NextResponse.json({
      servers,
      count: servers.length,
      panelBaseUrl: VMMANAGER_PANEL_URL
    })
  } catch (error) {
    console.error('[User VDS] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch VDS servers' },
      { status: 500 }
    )
  }
}
