/**
 * VDS Reinstall API
 * Переустановка ОС на VDS сервере
 */

import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { getVMManager6API } from '@/vm6/vmmanager6'
import { getVMManager6Rentals } from '@/vm6/vmmanager6-rentals'
import { prisma } from '@/lib/db'
import { sendVdsReinstalledEmail } from '@/lib/email'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

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

// POST - переустановить ОС на VDS
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const hostId = parseInt(id)
  
  if (isNaN(hostId)) {
    return NextResponse.json({ error: 'Invalid host ID' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { osId, password } = body

    if (!osId) {
      return NextResponse.json({ error: 'OS ID is required' }, { status: 400 })
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const rentals = getVMManager6Rentals(auth.userId)
    const rental = rentals.find(r => r.vmmanager6_host_id === hostId)
    
    if (!rental) {
      return NextResponse.json({ error: 'VDS not found' }, { status: 404 })
    }

    const osImage = await prisma.vdsOsImage.findFirst({
      where: { vmManagerId: osId, isActive: true }
    })

    if (!osImage) {
      return NextResponse.json({ error: 'OS not available' }, { status: 400 })
    }

    const vmAPI = getVMManager6API()
    await vmAPI.reinstallVm(hostId, { os: osId, password })

    console.log(`[VDS Reinstall] User ${auth.userId} reinstalled VDS ${hostId} with OS ${osId}`)

    let serverName = `VDS-${hostId}`
    let ipAddress: string | undefined
    try {
      const host = await vmAPI.getVm(hostId)
      serverName = host.name || serverName
      
      let ipv4List = host.ip4 || []
      if (ipv4List.length === 0) {
        try {
          ipv4List = await vmAPI.getVmIPv4(hostId)
        } catch {}
      }
      
      if (Array.isArray(ipv4List) && ipv4List.length > 0) {
        const ip = ipv4List[0]
        ipAddress = (ip as any).ip || (ip as any).ip_addr || (ip as any).name
      }
    } catch {}

    // Send email notification
    sendVdsReinstalledEmail(auth.email, {
      serverName,
      osName: osImage.name,
      password: password,
      ipAddress
    }).catch(err => console.error('[Email] Failed to send reinstall notification:', err))

    return NextResponse.json({
      success: true,
      message: 'Переустановка ОС запущена. Это может занять несколько минут.'
    })
  } catch (error) {
    console.error('[VDS Reinstall] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reinstall OS' },
      { status: 500 }
    )
  }
}
