/**
 * Script to add VDS categories: RU-1 and DE-1
 * RU-1: Intel i7-8700, 1 Gbit network
 * DE-1: Intel i5-12500A, 1 Gbit network
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Adding VDS categories...')

  // RU-1 Plans (Intel i7-8700, 1 Gbit)
  const ru1Plans = [
    {
      name: 'RU-1 Start',
      slug: 'ru1-start',
      description: 'Начальный VDS сервер в России',
      category: 'VDS',
      ram: 2048,  // 2GB
      cpu: 2,
      disk: 20480,  // 20GB
      price: 350,
      vdsCustomSpecs: JSON.stringify({ cpuModel: 'Intel i7-8700', network: '1 Gbit', location: 'RU-1' })
    },
    {
      name: 'RU-1 Basic',
      slug: 'ru1-basic',
      description: 'Базовый VDS сервер в России',
      category: 'VDS',
      ram: 4096,  // 4GB
      cpu: 4,
      disk: 40960,  // 40GB
      price: 650,
      vdsCustomSpecs: JSON.stringify({ cpuModel: 'Intel i7-8700', network: '1 Gbit', location: 'RU-1' })
    },
    {
      name: 'RU-1 Standard',
      slug: 'ru1-standard',
      description: 'Стандартный VDS сервер в России',
      category: 'VDS',
      ram: 8192,  // 8GB
      cpu: 6,
      disk: 81920,  // 80GB
      price: 1200,
      vdsCustomSpecs: JSON.stringify({ cpuModel: 'Intel i7-8700', network: '1 Gbit', location: 'RU-1' })
    },
    {
      name: 'RU-1 Pro',
      slug: 'ru1-pro',
      description: 'Профессиональный VDS сервер в России',
      category: 'VDS',
      ram: 16384,  // 16GB
      cpu: 8,
      disk: 163840,  // 160GB
      price: 2200,
      vdsCustomSpecs: JSON.stringify({ cpuModel: 'Intel i7-8700', network: '1 Gbit', location: 'RU-1' })
    }
  ]

  // DE-1 Plans (Intel i5-12500A, 1 Gbit)
  const de1Plans = [
    {
      name: 'DE-1 Start',
      slug: 'de1-start',
      description: 'Начальный VDS сервер в Германии',
      category: 'VDS',
      ram: 2048,  // 2GB
      cpu: 2,
      disk: 20480,  // 20GB
      price: 400,
      vdsCustomSpecs: JSON.stringify({ cpuModel: 'Intel i5-12500A', network: '1 Gbit', location: 'DE-1' })
    },
    {
      name: 'DE-1 Basic',
      slug: 'de1-basic',
      description: 'Базовый VDS сервер в Германии',
      category: 'VDS',
      ram: 4096,  // 4GB
      cpu: 4,
      disk: 40960,  // 40GB
      price: 750,
      vdsCustomSpecs: JSON.stringify({ cpuModel: 'Intel i5-12500A', network: '1 Gbit', location: 'DE-1' })
    },
    {
      name: 'DE-1 Standard',
      slug: 'de1-standard',
      description: 'Стандартный VDS сервер в Германии',
      category: 'VDS',
      ram: 8192,  // 8GB
      cpu: 6,
      disk: 81920,  // 80GB
      price: 1400,
      vdsCustomSpecs: JSON.stringify({ cpuModel: 'Intel i5-12500A', network: '1 Gbit', location: 'DE-1' })
    },
    {
      name: 'DE-1 Pro',
      slug: 'de1-pro',
      description: 'Профессиональный VDS сервер в Германии',
      category: 'VDS',
      ram: 16384,  // 16GB
      cpu: 8,
      disk: 163840,  // 160GB
      price: 2500,
      vdsCustomSpecs: JSON.stringify({ cpuModel: 'Intel i5-12500A', network: '1 Gbit', location: 'DE-1' })
    }
  ]

  const allPlans = [...ru1Plans, ...de1Plans]

  for (const planData of allPlans) {
    try {
      // Check if plan already exists
      const existing = await prisma.plan.findUnique({
        where: { slug: planData.slug }
      })

      if (existing) {
        console.log(`✓ Plan "${planData.name}" already exists, updating...`)
        await prisma.plan.update({
          where: { slug: planData.slug },
          data: planData
        })
      } else {
        console.log(`+ Creating plan "${planData.name}"...`)
        await prisma.plan.create({
          data: {
            ...planData,
            databases: 0,
            backups: 0,
            allocations: 0,
            isActive: true,
            sortOrder: 0
          }
        })
      }
    } catch (error) {
      console.error(`✗ Error with plan "${planData.name}":`, error.message)
    }
  }

  console.log('\n✓ VDS categories added successfully!')
  console.log(`  - RU-1 plans: ${ru1Plans.length}`)
  console.log(`  - DE-1 plans: ${de1Plans.length}`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
