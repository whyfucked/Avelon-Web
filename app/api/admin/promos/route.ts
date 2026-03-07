import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth-admin'

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const promos = await prisma.promoCode.findMany({
      include: {
        _count: { select: { usages: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(promos)
  } catch (error) {
    console.error('Fetch promos error:', error)
    return NextResponse.json({ error: 'Failed to fetch promos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    
    const promo = await prisma.promoCode.create({
      data: {
        code: body.code.toUpperCase(),
        type: body.type,
        value: body.value,
        maxUses: body.maxUses || null,
        minAmount: body.minAmount || null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        isActive: body.isActive ?? true,
      },
      include: {
        _count: { select: { usages: true } },
      },
    })
    
    return NextResponse.json(promo)
  } catch (error: unknown) {
    console.error('Create promo error:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Промокод с таким кодом уже существует' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create promo' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, ...data } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Promo ID required' }, { status: 400 })
    }
    
    const promo = await prisma.promoCode.update({
      where: { id },
      data: {
        ...(data.code !== undefined && { code: data.code.toUpperCase() }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.value !== undefined && { value: data.value }),
        ...(data.maxUses !== undefined && { maxUses: data.maxUses || null }),
        ...(data.minAmount !== undefined && { minAmount: data.minAmount || null }),
        ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        _count: { select: { usages: true } },
      },
    })
    
    return NextResponse.json(promo)
  } catch (error) {
    console.error('Update promo error:', error)
    return NextResponse.json({ error: 'Failed to update promo' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Promo ID required' }, { status: 400 })
    }
    
    await prisma.promoCode.delete({ where: { id } })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete promo error:', error)
    return NextResponse.json({ error: 'Failed to delete promo' }, { status: 500 })
  }
}
