import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: 'Пароль обязателен' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ 
      where: { id: authUser.id },
      select: { id: true, password: true, pterodactylId: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 400 })
    }

    const servers = await prisma.server.findMany({
      where: { userId: user.id }
    })

    for (const server of servers) {
      if (server.pterodactylId) {
        try {
          await fetch(`${process.env.PTERODACTYL_URL}/api/application/servers/${server.pterodactylId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${process.env.PTERODACTYL_API_KEY}`,
              'Accept': 'application/json',
            },
          })
        } catch {}
      }
    }

    if (user.pterodactylId) {
      try {
        await fetch(`${process.env.PTERODACTYL_URL}/api/application/users/${user.pterodactylId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.PTERODACTYL_API_KEY}`,
            'Accept': 'application/json',
          },
        })
      } catch {}
    }

    await prisma.server.deleteMany({ where: { userId: user.id } })
    await prisma.transaction.deleteMany({ where: { userId: user.id } })
    await prisma.user.delete({ where: { id: user.id } })

    const cookieStore = await cookies()
    cookieStore.delete('token')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ error: 'Ошибка удаления аккаунта' }, { status: 500 })
  }
}
