import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { 
  createPterodactylUser, 
  findPterodactylUserByEmail,
  updatePterodactylUserPassword,
  getPterodactylUser
} from '@/lib/pterodactyl'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ 
      where: { id: authUser.id },
      select: { pterodactylId: true, pterodactylPassword: true, email: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.pterodactylId) {
      return NextResponse.json({ linked: false })
    }

    try {
      const pteroUser = await getPterodactylUser(user.pterodactylId)
      return NextResponse.json({ 
        linked: true,
        pterodactyl: {
          id: pteroUser.id,
          username: pteroUser.username,
          email: pteroUser.email,
        },
        password: user.pterodactylPassword || null, // Возвращаем сохраненный пароль
      })
    } catch {
      return NextResponse.json({ linked: false, error: 'Pterodactyl user not found' })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get pterodactyl info' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ 
      where: { id: authUser.id },
      select: { id: true, pterodactylId: true, email: true, name: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.pterodactylId) {
      return NextResponse.json({ error: 'Pterodactyl account already linked' }, { status: 400 })
    }

    const existingPteroUser = await findPterodactylUserByEmail(user.email)
    
    if (existingPteroUser) {
      await prisma.user.update({
        where: { id: user.id },
        data: { pterodactylId: existingPteroUser.id },
      })
      
      return NextResponse.json({ 
        success: true, 
        message: 'Existing account linked',
        pterodactyl: {
          id: existingPteroUser.id,
          username: existingPteroUser.username,
          email: existingPteroUser.email,
        }
      })
    }

    const username = user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now().toString().slice(-4)
    const password = generatePassword()
    
    const pteroUser = await createPterodactylUser({
      email: user.email,
      username: username,
      firstName: user.name || 'User',
      lastName: user.id.slice(-4),
      password: password,
    })

    await prisma.user.update({
      where: { id: user.id },
      data: { pterodactylId: pteroUser.id },
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Account created',
      pterodactyl: {
        id: pteroUser.id,
        username: pteroUser.username,
        email: pteroUser.email,
      },
      password: password, // Показать пароль только при создании!
    })
  } catch (error) {
    console.error('Create pterodactyl account error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  console.log('[PATCH /api/user/pterodactyl] Starting password reset...')
  
  try {
    const authUser = await getAuthUser(request)
    console.log('[PATCH] Auth user:', authUser?.id || 'null')
    
    if (!authUser) {
      console.log('[PATCH] Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ 
      where: { id: authUser.id },
      select: { pterodactylId: true }
    })
    console.log('[PATCH] User pterodactylId:', user?.pterodactylId || 'null')

    if (!user?.pterodactylId) {
      console.log('[PATCH] No Pterodactyl account linked')
      return NextResponse.json({ error: 'No Pterodactyl account linked' }, { status: 400 })
    }

    const newPassword = generatePassword()
    console.log('[PATCH] Generated password, updating in Pterodactyl...')

    await updatePterodactylUserPassword(user.pterodactylId, newPassword)
    console.log('[PATCH] Password updated successfully')

    return NextResponse.json({ 
      success: true, 
      password: newPassword,
    })
  } catch (error) {
    console.error('[PATCH] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

function generatePassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const allChars = lowercase + uppercase + numbers
  
  let password = ''
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length))
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length))
  password += numbers.charAt(Math.floor(Math.random() * numbers.length))
  
  for (let i = 3; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length))
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('')
}
