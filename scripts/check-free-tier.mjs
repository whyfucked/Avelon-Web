import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== ТАРИФЫ ===')
    const plans = await prisma.plan.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        isFree: true,
        isActive: true,
      }
    })
    plans.forEach(p => {
      console.log(`${p.name}: price=${p.price}, isFree=${p.isFree}, isActive=${p.isActive}`)
    })

    console.log('\n=== НОДЫ ===')
    const nodes = await prisma.pterodactylNode.findMany({
      select: {
        id: true,
        name: true,
        locationName: true,
        isFree: true,
        isActive: true,
        priceModifier: true,
      }
    })
    nodes.forEach(n => {
      console.log(`${n.name} (${n.locationName}): isFree=${n.isFree}, isActive=${n.isActive}, priceModifier=${n.priceModifier}`)
    })

    console.log('\n=== ПРОВЕРКА ФИЛЬТРАЦИИ ===')
    const freePlans = plans.filter(p => p.isFree)
    const paidPlans = plans.filter(p => !p.isFree)
    const freeNodes = nodes.filter(n => n.isFree)
    const paidNodes = nodes.filter(n => !n.isFree)

    console.log(`Бесплатных тарифов: ${freePlans.length}`)
    console.log(`Платных тарифов: ${paidPlans.length}`)
    console.log(`Бесплатных нод: ${freeNodes.length}`)
    console.log(`Платных нод: ${paidNodes.length}`)

    if (freePlans.length > 0 && freeNodes.length === 0) {
      console.log('\n⚠️  ПРОБЛЕМА: Есть бесплатные тарифы, но нет бесплатных нод!')
    }
    if (paidPlans.length > 0 && paidNodes.length === 0) {
      console.log('\n⚠️  ПРОБЛЕМА: Есть платные тарифы, но нет платных нод!')
    }
  } catch (error) {
    console.error('Ошибка:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
