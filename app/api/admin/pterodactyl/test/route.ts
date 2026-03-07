import { NextRequest, NextResponse } from 'next/server'
import { testConnection } from '@/lib/pterodactyl'
import { requireAdminAuth } from '@/lib/auth-admin'

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const result = await testConnection()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ 
      connected: false, 
      error: error instanceof Error ? error.message : String(error) 
    })
  }
}
