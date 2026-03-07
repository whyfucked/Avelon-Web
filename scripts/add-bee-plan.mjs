const API_URL = 'http://localhost:3000/api/admin/plans'

const beePlan = {
  name: 'Пчела - FREE',
  slug: 'bee-free',
  description: 'Бесплатный тариф',
  category: 'MINECRAFT',
  ram: 4096,
  cpu: 150,
  disk: 15360,
  databases: 1,
  backups: 3,
  price: 0,
  isFree: true,
  customIcon: 'https://mcheads.ru/heads/medium/front/xcft.png',
  isActive: true,
  sortOrder: 0,
  allowedEggIds: [],
}

async function addPlan() {
  try {
    console.log('Добавляю тариф "Пчела - FREE"...')
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(beePlan),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Ошибка:', error)
      return
    }

    const result = await response.json()
    console.log('✅ Тариф успешно добавлен!')
    console.log('ID:', result.id)
    console.log('Название:', result.name)
    console.log('Цена:', result.price, '₽')
    console.log('RAM:', result.ram, 'MB')
    console.log('CPU:', result.cpu, '%')
    console.log('Disk:', result.disk, 'MB')
  } catch (error) {
    console.error('Ошибка при добавлении тарифа:', error)
  }
}

addPlan()
