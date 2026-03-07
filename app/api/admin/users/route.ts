import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth-admin'
import { adminLogger } from '@/lib/admin-logger'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const users = await prisma.user.findMany({
      include: {
        _count: { select: { servers: true, transactions: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError
  
  try {
    // Получаем ID админа из токена
    const token = request.cookies.get('auth-token')?.value
    let adminId = 'unknown'
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
        adminId = decoded.userId
      } catch {}
    }

    const body = await request.json()
    const { userId, balance, role, name, email, password, emailVerified } = body
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }
    
    // Получаем старые данные пользователя для сравнения
    const oldUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!oldUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const updateData: any = {}
    
    if (balance !== undefined) {
      updateData.balance = balance
    }
    if (role !== undefined) {
      updateData.role = role
    }
    if (name !== undefined) {
      updateData.name = name
    }
    if (email !== undefined) {
      updateData.email = email
    }
    if (password !== undefined) {
      const bcrypt = require('bcryptjs')
      updateData.password = await bcrypt.hash(password, 10)
    }
    if (emailVerified !== undefined) {
      updateData.emailVerified = emailVerified
    }
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        _count: { select: { servers: true } },
      },
    })
    
    // Логирование изменения баланса
    if (balance !== undefined && balance !== oldUser.balance) {
      const diff = balance - oldUser.balance
      
      await prisma.transaction.create({
        data: {
          userId,
          type: diff > 0 ? 'DEPOSIT' : 'PAYMENT',
          amount: diff,
          description: 'Изменение баланса администратором',
        },
      })

      // Логирование для админки
      if (diff > 0) {
        await adminLogger.balanceAdd(userId, adminId, diff, 'Изменение администратором')
      } else {
        await adminLogger.balanceSubtract(userId, adminId, Math.abs(diff), 'Изменение администратором')
      }
    }
    
    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { userId } = body
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }
    
    const serversCount = await prisma.server.count({
      where: { userId, status: { notIn: ['DELETED'] } },
    })
    
    if (serversCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete user with ${serversCount} active servers` 
      }, { status: 400 })
    }
    
    await prisma.user.delete({ where: { id: userId } })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
