import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth-admin'

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { updates } = body

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid updates' }, { status: 400 })
    }

    await Promise.all(
      updates.map(({ id, sortOrder }: { id: string; sortOrder: number }) =>
        prisma.serviceStatus.update({
          where: { id },
          data: { sortOrder },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to reorder statuses' }, { status: 500 })
  }
}
