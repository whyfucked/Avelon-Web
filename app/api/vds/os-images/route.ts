/**
 * VDS OS Images API (Public)
 * Получение списка доступных ОС для клиентов
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - получить список активных ОС
export async function GET() {
  try {
    const images = await prisma.vdsOsImage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        vmManagerId: true,
        name: true
      }
    })

    return NextResponse.json(images)
  } catch (error) {
    console.error('[VDS OS Images] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch OS images' },
      { status: 500 }
    )
  }
}
