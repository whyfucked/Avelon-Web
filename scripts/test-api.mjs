async function testAPI() {
  try {
    console.log('Тестируем API /api/nodes...\n')
    
    const response = await fetch('http://localhost:3001/api/nodes')
    const nodes = await response.json()
    
    console.log('=== ОТВЕТ API ===')
    console.log(JSON.stringify(nodes, null, 2))
    
    console.log('\n=== АНАЛИЗ ===')
    const freeNodes = nodes.filter(n => n.isFree)
    const paidNodes = nodes.filter(n => !n.isFree)
    
    console.log(`Бесплатных нод: ${freeNodes.length}`)
    freeNodes.forEach(n => console.log(`  - ${n.name} (${n.locationName})`))
    
    console.log(`\nПлатных нод: ${paidNodes.length}`)
    paidNodes.forEach(n => console.log(`  - ${n.name} (${n.locationName})`))
    
  } catch (error) {
    console.error('Ошибка:', error.message)
  }
}

testAPI()
