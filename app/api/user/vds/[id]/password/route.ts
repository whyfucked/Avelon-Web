import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { getVMManager6API } from '@/vm6/vmmanager6'
import { getVMManager6Rentals } from '@/vm6/vmmanager6-rentals'
import { sendVdsPasswordChangedEmail } from '@/lib/email'

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const hostId = parseInt(id)
    if (isNaN(hostId)) {
      return NextResponse.json({ error: 'Invalid host ID' }, { status: 400 })
    }

    const body = await request.json()
    const { password } = body

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Verify ownership
    const rentals = getVMManager6Rentals(auth.userId)
    const rental = rentals.find(r => r.vmmanager6_host_id === hostId)

    if (!rental) {
      return NextResponse.json({ error: 'VDS not found or access denied' }, { status: 404 })
    }

    // Check if rental is active
    if (rental.status !== 'active') {
      return NextResponse.json(
        { error: 'Сервер приостановлен. Продлите подписку.' },
        { status: 403 }
      )
    }

    // Change password via VMManager6 API
    const vmApi = getVMManager6API()
    await vmApi.changeVmPassword(hostId, password)

    let serverName = `VDS-${hostId}`
    let ipAddress: string | undefined
    try {
      const host = await vmApi.getVm(hostId)
      serverName = host.name || serverName
      
      let ipv4List = host.ip4 || []
      if (ipv4List.length === 0) {
        try {
          ipv4List = await vmApi.getVmIPv4(hostId)
        } catch {}
      }
      
      if (Array.isArray(ipv4List) && ipv4List.length > 0) {
        const ip = ipv4List[0]
        ipAddress = (ip as any).ip || (ip as any).ip_addr || (ip as any).name || ip.name
      }
    } catch (e) {
      console.error('[VDS Password Change] Failed to get server info:', e)
    }

    console.log('[VDS Password Change] Sending email to:', auth.email)
    sendVdsPasswordChangedEmail(auth.email, {
      serverName,
      password,
      ipAddress
    }).catch(err => console.error('[Email] Failed to send password change notification:', err))

    return NextResponse.json({ 
      success: true, 
      message: 'Пароль успешно изменён. Уведомление отправлено на email.' 
    })
  } catch (error) {
    console.error('[VDS Password Change] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to change password' },
      { status: 500 }
    )
  }
}
