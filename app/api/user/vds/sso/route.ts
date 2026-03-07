/**
 * VMManager6 SSO API
 * Генерация ссылки для автоматической авторизации в панели VMManager6
 */

import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
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

// GET - получить SSO конфигурацию и ссылку на панель
export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const hostId = searchParams.get('hostId')

    // Если указан hostId - проверяем что сервер принадлежит пользователю
    if (hostId) {
      const rental = getVMManager6RentalByServerId(auth.userId, `vmmanager6_${hostId}`)
      if (!rental) {
        return NextResponse.json({ error: 'Server not found or access denied' }, { status: 404 })
      }
    }

    const vmAPI = getVMManager6API()

    // Пробуем получить SSO конфигурацию
    try {
      const ssoConfig = await vmAPI.getSsoConfig()
      console.log('[VDS SSO] Got SSO config:', ssoConfig)

      // Новый формат SSO (sso_uri, client_id, redirect_uri)
      if (ssoConfig.sso_uri && ssoConfig.client_id && ssoConfig.redirect_uri) {
        const ssoUrl = new URL(ssoConfig.sso_uri)
        ssoUrl.searchParams.set('client_id', ssoConfig.client_id)
        ssoUrl.searchParams.set('redirect_uri', ssoConfig.redirect_uri)
        ssoUrl.searchParams.set('response_type', 'code')
        ssoUrl.searchParams.set('scope', 'openid profile email')

        return NextResponse.json({
          ssoUrl: ssoUrl.toString(),
          panelUrl: hostId 
            ? `${VMMANAGER_PANEL_URL}/vm/host/${hostId}`
            : VMMANAGER_PANEL_URL,
          hostId: hostId || null,
          ssoEnabled: true
        })
      }

      // Старый формат с providers
      if (ssoConfig.providers && ssoConfig.providers.length > 0) {
        const provider = ssoConfig.providers[0]
        const ssoUrl = new URL(provider.authorization_url)
        ssoUrl.searchParams.set('client_id', provider.client_id)
        ssoUrl.searchParams.set('redirect_uri', `${VMMANAGER_PANEL_URL}/auth/callback`)
        ssoUrl.searchParams.set('response_type', 'code')
        ssoUrl.searchParams.set('scope', provider.scopes?.join(' ') || 'openid profile email')

        return NextResponse.json({
          ssoUrl: ssoUrl.toString(),
          panelUrl: hostId 
            ? `${VMMANAGER_PANEL_URL}/vm/host/${hostId}`
            : VMMANAGER_PANEL_URL,
          hostId: hostId || null,
          ssoEnabled: true
        })
      }

      // SSO не настроен - возвращаем просто ссылку на панель
      console.log('[VDS SSO] SSO not configured, returning panel URL')
      return NextResponse.json({
        panelUrl: hostId 
          ? `${VMMANAGER_PANEL_URL}/vm/host/${hostId}`
          : VMMANAGER_PANEL_URL,
        hostId: hostId || null,
        ssoEnabled: false
      })

    } catch (ssoError) {
      console.error('[VDS SSO] Failed to get SSO config:', ssoError)
      // SSO недоступен - возвращаем просто ссылку на панель
      return NextResponse.json({
        panelUrl: hostId 
          ? `${VMMANAGER_PANEL_URL}/vm/host/${hostId}`
          : VMMANAGER_PANEL_URL,
        hostId: hostId || null,
        ssoEnabled: false
      })
    }
  } catch (error) {
    console.error('[VDS SSO] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate SSO link' },
      { status: 500 }
    )
  }
}

// POST - обменять код на токен (callback)
export async function POST(request: NextRequest) {
  const auth = getAuthFromRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { code, redirectUri } = body

    if (!code || !redirectUri) {
      return NextResponse.json({ error: 'Missing code or redirectUri' }, { status: 400 })
    }

    const vmAPI = getVMManager6API()
    const tokenResponse = await vmAPI.exchangeOidcCode(code, redirectUri)

    return NextResponse.json({
      success: true,
      token: tokenResponse.access_token,
      expiresIn: tokenResponse.expires_in
    })
  } catch (error) {
    console.error('[VDS SSO] Token exchange error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to exchange token' },
      { status: 500 }
    )
  }
}
