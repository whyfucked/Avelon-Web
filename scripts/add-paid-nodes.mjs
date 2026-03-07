import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Добавляем платные ноды...')
    
    const paidNodes = [
      {
        id: 'node_us_1',
        pterodactylId: 2,
        name: 'US-1',
        fqdn: 'us1.example.com',
        locationId: 2,
        locationName: 'United States',
        countryCode: 'US',
        memory: 8192,
        disk: 102400,
        priceModifier: 0,
      },
      {
        id: 'node_eu_1',
        pterodactylId: 3,
        name: 'EU-1',
        fqdn: 'eu1.example.com',
        locationId: 3,
        locationName: 'Europe',
        countryCode: 'DE',
        memory: 8192,
        disk: 102400,
        priceModifier: 10,
      },
      {
        id: 'node_ru_1',
        pterodactylId: 4,
        name: 'RU-1',
        fqdn: 'ru1.example.com',
        locationId: 4,
        locationName: 'Russia',
        countryCode: 'RU',
        memory: 8192,
        disk: 102400,
        priceModifier: 0,
      },
    ]

    for (const nodeData of paidNodes) {
      const existing = await prisma.pterodactylNode.findUnique({
        where: { id: nodeData.id }
      })

      if (!existing) {
        const node = await prisma.pterodactylNode.create({
          data: {
            ...nodeData,
            isActive: true,
            isFree: false,
            allowCreation: true,
          }
        })
        console.log(`✓ Создана платная нода: ${node.name}`)
      } else {
        console.log(`✓ Нода уже существует: ${existing.name}`)
      }
    }

    // Проверяем результат
    console.log('\n=== ФИНАЛЬНОЕ СОСТОЯНИЕ ===')
    const nodes = await prisma.pterodactylNode.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        locationName: true,
        isFree: true,
      },
      orderBy: { name: 'asc' }
    })

    nodes.forEach(n => {
      const type = n.isFree ? '🟢 БЕСПЛАТНАЯ' : '🔴 ПЛАТНАЯ'
      console.log(`${type} ${n.name} (${n.locationName})`)
    })

    const freeCount = nodes.filter(n => n.isFree).length
    const paidCount = nodes.filter(n => !n.isFree).length
    console.log(`\nВсего: ${freeCount} бесплатных, ${paidCount} платных`)
  } catch (error) {
    console.error('Ошибка:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
