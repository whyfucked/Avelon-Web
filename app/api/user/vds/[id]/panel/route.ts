/**
 * VMManager Panel Access API
 * Генерация ссылки для входа в панель управления VDS через SSO
 */

import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'
import { getVMManager6API } from '@/vm6/vmmanager6'
import { getVMManager6RentalByServerId } from '@/vm6/vmmanager6-rentals'

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

// POST - получить ссылку на панель с SSO (автоматический вход)
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
    return NextResponse.json({ error: 'Invalid server ID' }, { status: 400 })
  }

  try {
    const rental = getVMManager6RentalByServerId(auth.userId, `vmmanager6_${hostId}`)
    if (!rental) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    if (rental.status === 'banned') {
      return NextResponse.json({ error: 'Server is banned' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { email: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const vmAPI = getVMManager6API()
    const baseUrl = vmAPI.getBaseUrl()

    // Пробуем получить SSO ключ для автоматического входа
    // Это аналог vmmanager6_get_sso_redirect_address из PHP модуля
    try {
      const ssoUrl = await vmAPI.getSsoRedirectUrl(user.email)
      
      // После авторизации редиректим на страницу хоста
      // VMManager6 после входа по ключу перенаправит на главную, 
      // поэтому добавляем redirect параметр
      const finalUrl = `${ssoUrl}?redirect=/vm/host/${hostId}`

      return NextResponse.json({
        success: true,
        panelUrl: finalUrl,
        autoLogin: true,
        method: 'key-auth'
      })
    } catch (ssoError) {
      console.error('[VDS Panel] SSO key auth failed:', ssoError)
      
      // Fallback - просто ссылка на панель
      return NextResponse.json({
        success: true,
        panelUrl: `${VMMANAGER_PANEL_URL}/vm/host/${hostId}`,
        autoLogin: false,
        error: 'SSO unavailable'
      })
    }
  } catch (error) {
    console.error('[VDS Panel] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get panel URL' },
      { status: 500 }
    )
  }
}

// GET - простая ссылка на панель (без SSO)
export async function GET(
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
    return NextResponse.json({ error: 'Invalid server ID' }, { status: 400 })
  }

  try {
    const rental = getVMManager6RentalByServerId(auth.userId, `vmmanager6_${hostId}`)
    if (!rental) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    return NextResponse.json({
      panelUrl: `${VMMANAGER_PANEL_URL}/vm/host/${hostId}`,
      hostId,
      serverName: `VDS-${hostId}`,
      planName: rental.plan_name,
      status: rental.status,
      expiresAt: rental.expires_at
    })
  } catch (error) {
    console.error('[VDS Panel] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get panel URL' },
      { status: 500 }
    )
  }
}
