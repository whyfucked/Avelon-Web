import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Проверяем, есть ли уже бесплатный тариф
    const existingFreePlan = await prisma.plan.findFirst({
      where: { isFree: true }
    })

    if (!existingFreePlan) {
      console.log('Создаём бесплатный тариф...')
      const freePlan = await prisma.plan.create({
        data: {
          id: 'plan_free',
          name: 'Бесплатный',
          slug: 'free',
          description: 'Бесплатный тариф для тестирования',
          category: 'MINECRAFT',
          ram: 1024,
          cpu: 50,
          disk: 20480,
          databases: 1,
          backups: 1,
          allocations: 1,
          price: 0,
          isFree: true,
          isActive: true,
          sortOrder: 0,
        }
      })
      console.log('✓ Бесплатный тариф создан:', freePlan.id)
    } else {
      console.log('✓ Бесплатный тариф уже существует:', existingFreePlan.id)
    }

    // Проверяем, есть ли уже бесплатная нода
    const existingFreeNode = await prisma.pterodactylNode.findFirst({
      where: { isFree: true }
    })

    if (!existingFreeNode) {
      console.log('Создаём бесплатную ноду...')
      const freeNode = await prisma.pterodactylNode.create({
        data: {
          id: 'node_free',
          pterodactylId: 1,
          name: 'Бесплатная локация',
          fqdn: 'free.example.com',
          locationId: 1,
          locationName: 'Free',
          countryCode: 'US',
          memory: 2048,
          disk: 20480,
          isActive: true,
          isFree: true,
          allowCreation: true,
          priceModifier: 0,
        }
      })
      console.log('✓ Бесплатная нода создана:', freeNode.id)
    } else {
      console.log('✓ Бесплатная нода уже существует:', existingFreeNode.id)
    }

    console.log('\n✓ Настройка завершена успешно!')
  } catch (error) {
    console.error('Ошибка:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
