import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const maintenanceSetting = await prisma.adminSettings.findUnique({
      where: { key: 'maintenanceMode' }
    })
    
    const serverCreationSetting = await prisma.adminSettings.findUnique({
      where: { key: 'serverCreationDisabled' }
    })

    return NextResponse.json({
      maintenanceMode: maintenanceSetting?.value === 'true',
      serverCreationDisabled: serverCreationSetting?.value === 'true'
    })
  } catch (error) {
    return NextResponse.json({
      maintenanceMode: false,
      serverCreationDisabled: false
    })
  }
}
