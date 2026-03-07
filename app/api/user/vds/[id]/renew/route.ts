/**
 * VDS Renew API
 * Продление аренды VDS сервера
 */

import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'
import { 
  getVMManager6Rentals, 
  renewVMManager6Rental 
} from '@/vm6/vmmanager6-rentals'

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

// POST - продлить VDS на 30 дней
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
    const rentals = getVMManager6Rentals(auth.userId)
    const rental = rentals.find(r => r.vmmanager6_host_id === hostId)
    
    if (!rental) {
      return NextResponse.json({ error: 'VDS not found' }, { status: 404 })
    }

    const plan = await prisma.plan.findFirst({
      where: { name: rental.plan_name, category: 'VDS' }
    })

    const price = plan?.price || rental.rental_price

    const user = await prisma.user.findUnique({
      where: { id: auth.userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.balance < price) {
      return NextResponse.json({ 
        error: 'Недостаточно средств',
        required: price,
        balance: user.balance
      }, { status: 400 })
    }

    const updatedRental = renewVMManager6Rental(rental.id, 30)
    
    if (!updatedRental) {
      return NextResponse.json({ error: 'Failed to renew rental' }, { status: 500 })
    }

    await prisma.user.update({
      where: { id: auth.userId },
      data: { balance: { decrement: price } }
    })

    await prisma.transaction.create({
      data: {
        userId: auth.userId,
        amount: -price,
        type: 'PAYMENT',
        description: `Продление VDS: ${rental.plan_name}`,
        status: 'COMPLETED'
      }
    })

    console.log(`[VDS Renew] User ${auth.userId} renewed VDS ${hostId} for ${price} RUB`)

    return NextResponse.json({
      success: true,
      message: 'VDS продлён на 30 дней',
      expiresAt: updatedRental.expires_at,
      price
    })
  } catch (error) {
    console.error('[VDS Renew] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to renew VDS' },
      { status: 500 }
    )
  }
}
