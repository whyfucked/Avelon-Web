import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const setting = await prisma.adminSettings.findUnique({
      where: { key: 'globalDiscount' }
    })
    
    const discount = setting ? parseFloat(setting.value) : 0
    
    return NextResponse.json({ discount })
  } catch {
    return NextResponse.json({ discount: 0 })
  }
}
