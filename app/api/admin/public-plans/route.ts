import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { publicGamePlans } from '@/lib/public-plans'
import { requireAdminAuth } from '@/lib/auth-admin'

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    return NextResponse.json(
      publicGamePlans.map((p, index) => ({
        key: p.key,
        name: p.name,
        category: p.category,
        price: p.price,
        vcpu: p.vcpu,
        ramMb: p.ramMb,
        diskMb: p.diskMb,
        databases: typeof p.db === 'number' ? p.db : null,
        unlimitedDatabases: p.db === '∞',
        backups: p.backups,
        mobIcon: p.mob,
        customIcon: p.customImg,
        sortOrder: index,
      })),
    )
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load public plans' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const items = Array.isArray(body?.items) ? body.items : []

    const created: string[] = []
    const skipped: string[] = []

    for (const item of items) {
      const key = String(item.key || '')
      const eggId: string | null = item.eggId || null
      if (!key) continue

      const tpl = publicGamePlans.find((p) => p.key === key)
      if (!tpl) continue

      const existing = await prisma.plan.findUnique({
        where: { slug: key },
        select: { id: true },
      })
      if (existing) {
        skipped.push(tpl.name)
        continue
      }

      const plan = await prisma.plan.create({
        data: {
          name: tpl.name,
          slug: tpl.key,
          description: null,
          category: tpl.category,
          ram: tpl.ramMb,
          cpu: tpl.vcpu * 100,
          disk: tpl.diskMb,
          databases: typeof tpl.db === 'number' ? tpl.db : 1,
          backups: tpl.backups,
          allocations: 1,
          price: tpl.price,
          eggId,
          mobIcon: tpl.mob,
          customIcon: tpl.customImg,
          isActive: true,
          sortOrder: publicGamePlans.findIndex((p) => p.key === tpl.key),
        },
      })

      if (eggId) {
        await prisma.planEggOption.create({
          data: {
            planId: plan.id,
            eggId,
          },
        })
      }

      created.push(tpl.name)
    }

    return NextResponse.json({ success: true, created, skipped })
  } catch (error) {
    console.error('Import public plans error:', error)
    return NextResponse.json({ error: 'Failed to import plans' }, { status: 500 })
  }
}
