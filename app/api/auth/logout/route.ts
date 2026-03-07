import { NextResponse } from 'next/server'
import { isAuthEnabled } from '@/lib/auth'

export async function POST() {
  const enabled = await isAuthEnabled()

  const response = NextResponse.json({
    success: true,
    authEnabled: enabled,
  })

  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
  })

  return response
}
