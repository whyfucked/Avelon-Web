import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Получаем только игровые планы (MINECRAFT и CODING)
    // VDS планы получаются через /api/vds/plans
    const plans = await prisma.plan.findMany({
      where: { 
        isActive: true,
        category: { in: ['MINECRAFT', 'CODING'] }
      },
      include: {
        egg: { select: { id: true, name: true, nestName: true, isActive: true } },
        eggOptions: {
          include: {
            egg: {
              select: { id: true, name: true, nestName: true, isActive: true },
            },
          },
        },
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { price: 'asc' }],
    })

    const filtered = plans
      .map((plan) => {
        const activeOptions = (plan.eggOptions || []).filter((opt) => opt.egg?.isActive)
        const defaultEggActive = plan.egg && plan.egg.isActive

        return {
          ...plan,
          eggOptions: activeOptions,
          egg: defaultEggActive ? plan.egg : null,
        }
      })
      .filter((plan) => {
        // Требуется активный egg для игровых серверов
        return (plan.egg && plan.egg.isActive) || (plan.eggOptions && plan.eggOptions.length > 0)
      })

    return NextResponse.json(filtered)
  } catch (error) {
    console.error('[Plans API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
  }
}
