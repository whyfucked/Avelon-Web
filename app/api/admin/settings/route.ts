import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth-admin'

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const settings = await prisma.adminSettings.findMany()
    return NextResponse.json(settings)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load admin settings' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { key, value } = body as { key: string; value: string }

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value required' }, { status: 400 })
    }

    await prisma.adminSettings.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save setting' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { authEnabled } = body as { authEnabled?: boolean }

    if (authEnabled !== undefined) {
      await prisma.adminSettings.upsert({
        where: { key: 'authEnabled' },
        create: { key: 'authEnabled', value: String(authEnabled) },
        update: { value: String(authEnabled) },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update admin settings' },
      { status: 500 },
    )
  }
}
