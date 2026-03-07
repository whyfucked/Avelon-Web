import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth-admin'

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const eggs = await prisma.pterodactylEgg.findMany({
      include: {
        _count: { select: { servers: true, plans: true } },
      },
      orderBy: [{ nestName: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json(eggs)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch eggs' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, ...data } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Egg ID required' }, { status: 400 })
    }
    
    const egg = await prisma.pterodactylEgg.update({
      where: { id },
      data: {
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.defaultEnv !== undefined && { defaultEnv: data.defaultEnv }),
      },
    })
    
    return NextResponse.json(egg)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update egg' }, { status: 500 })
  }
}
