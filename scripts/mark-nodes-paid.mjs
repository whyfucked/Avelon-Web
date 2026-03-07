import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Обновляем все ноды (кроме бесплатной) как платные...')
    
    const result = await prisma.pterodactylNode.updateMany({
      where: {
        isFree: false
      },
      data: {
        isFree: false  // Убедимся, что они платные
      }
    })
    
    console.log(`✓ Обновлено нод: ${result.count}`)

    // Проверяем результат
    const nodes = await prisma.pterodactylNode.findMany({
      select: {
        id: true,
        name: true,
        locationName: true,
        isFree: true,
        isActive: true,
      }
    })

    console.log('\n=== ТЕКУЩЕЕ СОСТОЯНИЕ НОД ===')
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
